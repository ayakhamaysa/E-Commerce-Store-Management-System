// Public configuration template.
// Replace these placeholder values with your own store and Supabase project settings.
window.STORE_CONFIG = {
  storeName: "Your Store",
  shortName: "Store",
  adminEmail: "admin@example.com",
  currency: "₪",
  whatsapp: "970000000000",
  announcement: "Fast and secure delivery",
  heroEyebrow: "Carefully selected collection",
  heroTitle: "Modern shopping,",
  heroAccent: "made simple.",
  heroDescription: "Browse products, manage orders, and control inventory from one system.",
  primaryColor: "#171714",
  accentColor: "#b49367",
  backgroundColor: "#f6f3ee",
  heroBackgroundColor: "#eae3d8",
  cardBackgroundColor: "#ffffff",
  announcementColor: "#171714",
  headerBackgroundColor: "#f6f3ee",
  phonePrefixes: ["+970", "+972"],
  deliveryZones: [
    { name: "Zone 1", price: 20 },
    { name: "Zone 2", price: 35 },
    { name: "Zone 3", price: 70 }
  ],

  // Use your own Supabase project URL and public anon/publishable key.
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
};
