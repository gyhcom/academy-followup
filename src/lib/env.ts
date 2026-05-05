export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  solapiApiKey: process.env.SOLAPI_API_KEY ?? "",
  solapiApiSecret: process.env.SOLAPI_API_SECRET ?? "",
  solapiSenderPhone: process.env.SOLAPI_SENDER_PHONE ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
