const clientId = "820520272347-ooop6u9j8e6k34h1uslrkb0gfhukh9ra.apps.googleusercontent.com";
const redirectUri = "https://psftgweqjfefrjtsmhoy.supabase.co/functions/v1/google-auth";
const shopId = "test-shop-id";
const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${shopId}`;

console.log(authUrl);
