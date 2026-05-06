export type AdminProduct = {
  id: string; slug: string; name: string; brand: string; category: string;
  price: number; image: string; images: string[]; views: number; likes: number;
  date: string; material?: string; style?: string; color?: string;
  description: string; dimensions?: { w: number; l: number; h: number };
  fileSizeMb: number; status: "Published" | "Draft" | "Free";
};

export const adminProducts: AdminProduct[] = [
  { id:"1", slug:"sofa-harlem", name:"Sofa Harlem", brand:"Villevenete", category:"Sofas", price:9043, status:"Published", image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600", images:["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900","https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=900"], views:9695, likes:1884, date:"10.03.2026", material:"Fabric", style:"Modern", color:"Beige", description:"Elegant modular sofa with refined tailoring and generous proportions.", dimensions:{w:240,l:95,h:82}, fileSizeMb:118.7 },
  { id:"2", slug:"wall-deco-nature", name:"SCENT OF NATURE B-6S", brand:"Wall Deco", category:"Decor", price:359, status:"Published", image:"https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600", images:["https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=900"], views:5784, likes:836, date:"09.03.2026", material:"Ceramic", style:"Contemporary", color:"White", description:"Sculptural wall decoration inspired by natural forms.", fileSizeMb:42.3 },
  { id:"3", slug:"office-chair-416", name:"Office Chair 416", brand:"Polflex", category:"Chairs", price:1297, status:"Published", image:"https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600", images:["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=900"], views:6751, likes:781, date:"09.03.2026", material:"Wood + Leather", style:"Modern", color:"Brown", description:"Ergonomic office chair with premium walnut frame and full-grain leather seat.", fileSizeMb:76.1 },
  { id:"4", slug:"sofa-wimbledon", name:"Sofa Wimbledon", brand:"Villevenete", category:"Sofas", price:9429, status:"Published", image:"https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600", images:["https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900"], views:6689, likes:1187, date:"06.03.2026", material:"Leather", style:"Classic", color:"Black", description:"Statement three-seat sofa upholstered in full-grain black leather.", fileSizeMb:132.4 },
  { id:"5", slug:"office-desk-xander", name:"Office Desk Xander", brand:"Arbore", category:"Desks", price:0, status:"Free", image:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600", images:["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900","https://images.unsplash.com/photo-1503602642458-232111445657?w=900"], views:3422, likes:610, date:"04.03.2026", material:"Wood", style:"Modern", color:"Walnut", description:"With its commanding presence and sculptural lines, Xander is more than a desk.", dimensions:{w:180,l:217,h:82}, fileSizeMb:118.7 },
  { id:"6", slug:"modular-sofa-achille", name:"Modular Sofa Achille", brand:"Villevenete", category:"Sofas", price:7820, status:"Draft", image:"https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=600", images:["https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=900"], views:4120, likes:922, date:"02.03.2026", material:"Velvet", style:"Contemporary", color:"Grey", description:"Modular configuration with deep seats and soft velvet upholstery.", fileSizeMb:95.2 },
  { id:"7", slug:"barn-house-5", name:"Barn House 5", brand:"K_Design", category:"Exterior", price:1899, status:"Published", image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600", images:["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900"], views:2834, likes:410, date:"01.03.2026", style:"Rustic", description:"Full architectural scene of a barn-style country house with landscaping.", fileSizeMb:512.0 },
  { id:"8", slug:"neoclassical-bathroom", name:"Neoclassical Bathroom 44", brand:"Marble Studio", category:"Interior", price:689, status:"Published", image:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600", images:["https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900"], views:3580, likes:520, date:"28.02.2026", style:"Neoclassical", description:"Full bathroom scene with marble finishes and classical detailing.", fileSizeMb:244.0 },
];

export type AdminBundle = {
  id: string; slug: string; name: string; tag: string; badge?: string;
  description: string; image: string; images: string[]; productIds: string[];
  originalPrice: number; bundlePrice: number; savings: number;
  modelCount: number; fileSizeMb: number; formats: string[];
  status: "Published" | "Draft";
};

export const adminBundles: AdminBundle[] = [
  { id:"b1", slug:"living-room-essentials", name:"Living Room Essentials", tag:"Most Popular", badge:"Best Value", status:"Published", description:"Everything you need to furnish a complete living room scene.", image:"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=85", images:["https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=85","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=85"], productIds:["1","4","6","2"], originalPrice:26271, bundlePrice:17900, savings:32, modelCount:4, fileSizeMb:388.5, formats:[".max",".fbx",".obj",".skp"] },
  { id:"b2", slug:"workspace-collection", name:"Workspace Collection", tag:"New Bundle", status:"Published", description:"A curated set of office and workspace assets.", image:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=85", images:["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900&q=85"], productIds:["5","3","2"], originalPrice:2953, bundlePrice:1990, savings:33, modelCount:3, fileSizeMb:194.1, formats:[".max",".fbx",".obj"] },
  { id:"b3", slug:"architectural-scenes-pack", name:"Architectural Scenes Pack", tag:"Studio Pick", badge:"Studio Exclusive", status:"Published", description:"Two complete architectural scenes plus the Villevenete sofa collection.", image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=85", images:["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85"], productIds:["7","8","6"], originalPrice:10408, bundlePrice:6990, savings:33, modelCount:3, fileSizeMb:851.2, formats:[".max",".fbx",".obj",".skp"] },
  { id:"b4", slug:"complete-interior-kit", name:"Complete Interior Kit", tag:"Ultimate Bundle", badge:"Save 40%", status:"Draft", description:"All 8 flagship assets in a single download.", image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=85", images:["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=85"], productIds:["1","2","3","4","5","6","7","8"], originalPrice:31336, bundlePrice:18900, savings:40, modelCount:8, fileSizeMb:1243.5, formats:[".max",".fbx",".obj",".skp"] },
];

export type HeroSlide = {
  id: string; img: string; tag: string; title: string[]; sub: string;
  cta: string; href: string; accent: string; active: boolean; order: number;
};

export const adminHeroSlides: HeroSlide[] = [
  { id:"h1", order:1, active:true, img:"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1800&q=95", tag:"Spring Collection — 2026", title:["Where Craft","Meets Precision"], sub:"Premium 3D assets from the world's most respected furniture and design brands.", cta:"Explore Models", href:"/models", accent:"Villevenete · Polflex · Arbore" },
  { id:"h2", order:2, active:true, img:"https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1800&q=95", tag:"Featured Brand — Villevenete", title:["Timeless Forms,","Digital Fidelity"], sub:"Every curve, every stitch — reproduced with obsessive accuracy for your renders.", cta:"Shop Sofas", href:"/models", accent:"Sofas · Seating · Upholstery" },
  { id:"h3", order:3, active:true, img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&q=95", tag:"3D Scenes — Exterior", title:["Full Scenes,","Ready to Render"], sub:"Complete architectural environments with lighting, landscaping, and atmosphere.", cta:"Browse Scenes", href:"/scenes", accent:"Exterior · Interior · Landscape" },
  { id:"h4", order:4, active:false, img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1800&q=95", tag:"Marble Studio — Exclusive", title:["Luxury Interiors","At Your Fingertips"], sub:"Neoclassical and contemporary interior scenes crafted for the discerning designer.", cta:"View Collection", href:"/models", accent:"Marble · Stone · Neoclassical" },
];

export const adminOrders = [
  { id:"LX-58412", customer:"Alex Novak", email:"alex@studio.io", date:"12.03.2026", items:2, total:10340, status:"Completed", payment:"Visa •••• 4242" },
  { id:"LX-58411", customer:"Maria Rossi", email:"maria@rossi.it", date:"12.03.2026", items:1, total:9429, status:"Completed", payment:"Mastercard" },
  { id:"LX-58410", customer:"John Lee", email:"j.lee@agency.com", date:"11.03.2026", items:3, total:2015, status:"Pending", payment:"UPI" },
  { id:"LX-58409", customer:"Yuki Tanaka", email:"yuki@t-arch.jp", date:"11.03.2026", items:1, total:1297, status:"Completed", payment:"Visa" },
  { id:"LX-58408", customer:"Priya Sharma", email:"priya@design.in", date:"10.03.2026", items:5, total:18450, status:"Refunded", payment:"Mastercard" },
  { id:"LX-58407", customer:"Daniel Brown", email:"d.brown@mail.com", date:"10.03.2026", items:1, total:359, status:"Completed", payment:"PayPal" },
];

export const adminUsers = [
  { id:"U-001", name:"Alex Novak", email:"alex@studio.io", joined:"02.01.2026", orders:12, spent:42300, status:"Active" },
  { id:"U-002", name:"Maria Rossi", email:"maria@rossi.it", joined:"15.01.2026", orders:8, spent:31200, status:"Active" },
  { id:"U-003", name:"John Lee", email:"j.lee@agency.com", joined:"20.01.2026", orders:3, spent:5400, status:"Active" },
  { id:"U-004", name:"Yuki Tanaka", email:"yuki@t-arch.jp", joined:"02.02.2026", orders:1, spent:1297, status:"Active" },
  { id:"U-005", name:"Priya Sharma", email:"priya@design.in", joined:"10.02.2026", orders:15, spent:62100, status:"Active" },
  { id:"U-006", name:"Daniel Brown", email:"d.brown@mail.com", joined:"25.02.2026", orders:1, spent:359, status:"Suspended" },
];

export const adminCategories = [
  { id:"1", name:"3D Models", slug:"models", products:1284, subCount:4 },
  { id:"2", name:"3D Scenes", slug:"scenes", products:412, subCount:2 },
  { id:"3", name:"3D Sets", slug:"sets", products:89, subCount:0 },
  { id:"4", name:"Textures", slug:"textures", products:3120, subCount:3 },
  { id:"5", name:"Bundles", slug:"bundles", products:4, subCount:0 },
];

export const adminBlog = [
  { id:"1", title:"Multifunctional Family Space Redefined with Deco Line 3D Wall Panels", author:"Lexxus Team", date:"12.03.2026", status:"Published", excerpt:"How modular panels transform shared living spaces.", image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600" },
  { id:"2", title:"Studjo Wallart: Croatian Art Transformed into Interior", author:"Lexxus Team", date:"10.03.2026", status:"Published", excerpt:"A deep-dive into Studjo's material-first philosophy.", image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600" },
  { id:"3", title:"Gyform: Where Beauty Meets Comfort", author:"Lexxus Team", date:"08.03.2026", status:"Draft", excerpt:"Italian craftsmanship for the modern home.", image:"https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=600" },
];

export const dashboardStats = {
  revenue: 284520, orders: 1842, customers: 612, products: 1284,
  revenueChart: [45,62,58,71,80,92,88,105,120,118,132,145],
};
