import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.44.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expected sheet columns (row 1 = headers, row 2+ = data)
// Name | Brand | SKU | Category | Price | Stock Status | Size | Color | Material | Finish
const COL = {
  name: 0,
  brand: 1,
  sku: 2,
  category: 3,
  price: 4,
  stock_status: 5,
  size: 6,
  color: 7,
  material: 8,
  finish: 9,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single();
    if (!profile) throw new Error("Shop not found");
    const shopId = profile.shop_id;

    const { data: shop } = await supabase.from('shops').select('*').eq('id', shopId).single();
    if (!shop || !shop.google_refresh_token) throw new Error("Google account not connected");

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured.");

    // 1. Get Access Token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: shop.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const { access_token } = await tokenResponse.json();
    if (!access_token) throw new Error("Failed to get Google access token");

    // 2. Return token if requested (for Google Picker)
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "get_token") {
      return new Response(JSON.stringify({ access_token }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 3. Create spreadsheet if not connected yet
    let spreadsheetId = shop.connected_spreadsheet_id;
    if (!spreadsheetId) {
      // Create new sheet with headers
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title: "RetailFlow Catalog" },
          sheets: [{
            properties: { title: "Sheet1" },
            data: [{
              startRow: 0,
              startColumn: 0,
              rowData: [{
                values: ["Name", "Brand", "SKU", "Category", "Price", "Stock Status", "Size", "Color", "Material", "Finish"]
                  .map(v => ({ userEnteredValue: { stringValue: v } }))
              }]
            }]
          }]
        })
      });
      const sheetData = await createRes.json();
      spreadsheetId = sheetData.spreadsheetId;
      await supabase.from('shops').update({ connected_spreadsheet_id: spreadsheetId }).eq('id', shopId);

      return new Response(
        JSON.stringify({
          message: "Google Sheet created! Open it, add your products (one per row), then sync again.",
          spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Read the spreadsheet
    const readRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:J`,
      { headers: { "Authorization": `Bearer ${access_token}` } }
    );
    const readData = await readRes.json();
    const rows: string[][] = readData.values || [];

    if (rows.length < 2) {
      return new Response(
        JSON.stringify({ message: "Sheet is empty. Add product rows below the header row and sync again." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Parse rows (skip row 0 which is the header)
    const dataRows = rows.slice(1);
    const productsToUpsert = dataRows
      .filter(row => row[COL.name]?.trim()) // must have a name
      .map(row => ({
        shop_id: shopId,
        name: row[COL.name]?.trim() || '',
        brand: row[COL.brand]?.trim() || null,
        sku: row[COL.sku]?.trim() || null,
        category: row[COL.category]?.trim() || null,
        price: parseFloat(row[COL.price]) || 0,
        stock_status: row[COL.stock_status]?.trim() || 'in_stock',
        size: row[COL.size]?.trim() || null,
        color: row[COL.color]?.trim() || null,
        material: row[COL.material]?.trim() || null,
        finish: row[COL.finish]?.trim() || null,
      }));

    if (productsToUpsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No valid product rows found. Make sure rows have at least a product name." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 6. Upsert into Supabase products table (match on shop_id + sku if sku exists, else insert new)
    const withSku = productsToUpsert.filter(p => p.sku);
    const withoutSku = productsToUpsert.filter(p => !p.sku);

    let upsertCount = 0;

    if (withSku.length > 0) {
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(withSku, { onConflict: 'shop_id,sku', ignoreDuplicates: false });
      if (upsertError) throw upsertError;
      upsertCount += withSku.length;
    }

    if (withoutSku.length > 0) {
      const { error: insertError } = await supabase
        .from('products')
        .insert(withoutSku);
      if (insertError) throw insertError;
      upsertCount += withoutSku.length;
    }

    return new Response(
      JSON.stringify({ message: `Successfully synced ${upsertCount} products from Google Sheets.` }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in sync-google-sheet:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
