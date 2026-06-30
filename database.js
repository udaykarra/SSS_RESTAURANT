import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const mongoURI = process.env.MONGODB_URI || 'mongodb://udaykirankarra2_db_user:uday260603@ac-rawodyh-shard-00-00.zwkjb02.mongodb.net:27017,ac-rawodyh-shard-00-01.zwkjb02.mongodb.net:27017,ac-rawodyh-shard-00-02.zwkjb02.mongodb.net:27017/?ssl=true&replicaSet=atlas-bk7aib-shard-0&authSource=admin&appName=Cluster0';
const jsonDbPath = path.resolve('restaurant_db.json');

// Global Database Mode Flag
let useMongo = false;

// 1. MONGODB SCHEMAS DEFINITION
const menuCategorySchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  items: [{
    name: { type: String, required: true },
    veg: { type: Boolean, required: true },
    price: Number,
    sizes: mongoose.Schema.Types.Mixed
  }]
});
const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);

const staffUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});
const StaffUser = mongoose.model('StaffUser', staffUserSchema);

const pendingRegistrationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now }
});
const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);

const activeTabSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  items: [{
    lineId: { type: String, required: true },
    name: { type: String, required: true },
    veg: { type: Boolean, required: true },
    category: String,
    price: Number,
    qty: Number,
    size: String,
    notes: String,
    source: { type: String, default: 'customer' },
    done: { type: Boolean, default: false },
    sentToCook: { type: Boolean, default: true },
    served: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});
const ActiveTab = mongoose.model('ActiveTab', activeTabSchema);

const billSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  items: Array,
  notes: String,
  status: { type: String, default: 'Dine Completed' },
  createdAt: Date,
  completedAt: { type: Date, default: Date.now },
  total: Number
});
const Bill = mongoose.model('Bill', billSchema);

// 2. MONGODB CONNECTION ATTEMPT (3 second timeout)
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    useMongo = true;
    seedMongoDatabase();
  })
  .catch(err => {
    console.warn('MongoDB not found or timed out. Falling back to local file database (restaurant_db.json).');
    console.error('MongoDB Connection Error Details:', err.message);
    useMongo = false;
    seedLocalDatabase();
  });

// 3. SEEDING REPOSITORIES
const INITIAL_MENU = [
  {
    category: "Soups",
    items: [
      { name: "Chicken Sweet Corn", veg: false, price: 70 },
      { name: "Chicken Hot n Sour", veg: false, price: 70 },
      { name: "Chicken Manchow", veg: false, price: 80 },
      { name: "Chicken Lemon Coriander", veg: false, price: 70 },
      { name: "Tomato Soup", veg: true, price: 50 },
      { name: "Hot n Sour Veg", veg: true, price: 50 },
      { name: "Sweet Corn Veg", veg: true, price: 50 },
      { name: "Mushroom Soup", veg: true, price: 50 }
    ]
  },
  {
    category: "Tandoori",
    items: [
      { name: "Kalmi Kebab", veg: false, sizes: { "Half": 150, "Full": 300 } },
      { name: "Chicken Tikka", veg: false, sizes: { "Half": 140, "Full": 260 } },
      { name: "Chicken Hariyali Tikka", veg: false, sizes: { "Half": 140, "Full": 250 } },
      { name: "Chicken Afghani Tikka", veg: false, sizes: { "Half": 140, "Full": 250 } },
      { name: "Chicken Malai Tikka", veg: false, sizes: { "Half": 150, "Full": 260 } },
      { name: "Chicken Tandoori", veg: false, sizes: { "Half": 270, "Full": 500 } },
      { name: "Paneer Tikka (6 pcs)", veg: true, price: 180 },
      { name: "Malai Paneer Tikka", veg: true, price: 190 }
    ]
  },
  {
    category: "Starters",
    items: [
      { name: "Omelette", veg: false, price: 50 },
      { name: "Egg 65", veg: false, price: 150 },
      { name: "Chilli Egg", veg: false, price: 150 },
      { name: "Chicken Wings", veg: false, sizes: { "Dry": 180, "Wet": 190 } },
      { name: "Chilli Chicken", veg: false, price: 200 },
      { name: "Chicken 65", veg: false, price: 200 },
      { name: "Chicken Manchurian", veg: false, price: 200 },
      { name: "Garlic Chicken", veg: false, price: 210 },
      { name: "Dragon Chicken", veg: false, price: 220 },
      { name: "Chicken Majestic", veg: false, price: 220 },
      { name: "Chicken 555", veg: false, price: 220 },
      { name: "Chicken Lollipop", veg: false, sizes: { "Dry": 220, "Wet": 230 } },
      { name: "Chicken Drumstick", veg: false, price: 230 },
      { name: "Crispy Chicken", veg: false, price: 250 },
      { name: "Kaju Nut Chicken", veg: false, price: 250 },
      { name: "Sangrilla Chicken", veg: false, price: 250 },
      { name: "Stick Chicken", veg: false, price: 250 },
      { name: "Fish Roast", veg: false, price: 220 },
      { name: "Fish Fry", veg: false, price: 220 },
      { name: "Apollo Fish", veg: false, price: 250 },
      { name: "Fish 65", veg: false, price: 230 },
      { name: "Chilli Fish", veg: false, price: 240 },
      { name: "Chilli Prawns", veg: false, price: 260 },
      { name: "Prawn Manchurian", veg: false, price: 260 },
      { name: "Loose Prawns", veg: false, price: 270 },
      { name: "Prawn 65", veg: false, price: 260 },
      { name: "Mutton Roast", veg: false, price: 300 },
      { name: "French Fries", veg: true, price: 100 },
      { name: "Veg Manchurian", veg: true, price: 150 },
      { name: "Gobi Manchurian", veg: true, price: 150 },
      { name: "Gobi Chilli", veg: true, price: 150 },
      { name: "Gobi 65", veg: true, price: 150 },
      { name: "Chilli Baby Corn", veg: true, price: 150 },
      { name: "Crispy Corn", veg: true, price: 150 },
      { name: "Baby Corn Manchurian", veg: true, price: 170 },
      { name: "Baby Corn 65", veg: true, price: 170 },
      { name: "Golden Baby Corn", veg: true, price: 170 },
      { name: "Chilli Mushroom", veg: true, price: 170 },
      { name: "Mushroom 65", veg: true, price: 170 },
      { name: "Mushroom Manchurian", veg: true, price: 170 },
      { name: "Golden Mushroom", veg: true, price: 170 },
      { name: "Mushroom Pepper Dry", veg: true, price: 180 },
      { name: "Spicy Mushroom", veg: true, price: 180 },
      { name: "Chilli Paneer", veg: true, price: 190 },
      { name: "Paneer 65", veg: true, price: 190 },
      { name: "Paneer Manchurian", veg: true, price: 190 },
      { name: "Paneer Majestic", veg: true, price: 200 }
    ]
  },
  {
    category: "Curries",
    items: [
      { name: "Egg Curry", veg: false, price: 80 },
      { name: "Egg Kheema", veg: false, price: 110 },
      { name: "Anda Thadka", veg: false, price: 110 },
      { name: "Egg Burji", veg: false, price: 120 },
      { name: "Chicken Curry Bone", veg: false, price: 160 },
      { name: "Gongura Chicken", veg: false, price: 180 },
      { name: "Chicken Curry Boneless", veg: false, price: 200 },
      { name: "Chicken Patiyala", veg: false, price: 210 },
      { name: "Kadai Chicken", veg: false, price: 200 },
      { name: "Chicken Afghani Curry", veg: false, price: 220 },
      { name: "Apollo Fish Curry", veg: false, price: 250 },
      { name: "Andhra Chepala Pulusu", veg: false, price: 160 },
      { name: "Fish Masala", veg: false, price: 170 },
      { name: "Fish Fry (Curry)", veg: false, price: 180 },
      { name: "Fish Roast (Curry)", veg: false, price: 180 },
      { name: "Chicken Kholapuri", veg: false, price: 220 },
      { name: "Punjabi Chicken Curry", veg: false, price: 220 },
      { name: "Chicken Mughalai", veg: false, price: 220 },
      { name: "Chicken Tikka Masala", veg: false, price: 250 },
      { name: "Prawns Curry", veg: false, price: 250 },
      { name: "Prawn Masala", veg: false, price: 260 },
      { name: "Chicken Kalmi Masala", veg: false, price: 230 },
      { name: "Andhra Prawn Curry", veg: false, price: 240 },
      { name: "Butter Prawn Curry", veg: false, price: 250 },
      { name: "Gongura Mutton", veg: false, price: 300 },
      { name: "Mutton Curry", veg: false, price: 300 },
      { name: "Mutton Masala", veg: false, price: 300 },
      { name: "Mutton Rogan Josh", veg: false, price: 310 },
      { name: "Andhra Mutton Curry", veg: false, price: 320 },
      { name: "Mutton Kurma", veg: false, price: 350 },
      { name: "Dal Fry", veg: true, price: 110 },
      { name: "Dal Thadka", veg: true, price: 120 },
      { name: "Palak Paneer", veg: true, price: 150 },
      { name: "Kadai Paneer Curry", veg: true, price: 150 },
      { name: "Mushroom Curry", veg: true, price: 150 },
      { name: "Kaju Tomato", veg: true, price: 150 },
      { name: "Veg Kholapuri Curry", veg: true, price: 150 },
      { name: "Mixed Veg Curry", veg: true, price: 160 },
      { name: "Kadai Veg Curry", veg: true, price: 160 },
      { name: "Methi Chaman", veg: true, price: 160 },
      { name: "Paneer Kheema", veg: true, price: 160 },
      { name: "Paneer Butter Masala", veg: true, price: 160 },
      { name: "Kadai Mushroom Curry", veg: true, price: 160 },
      { name: "Kaju Mushroom Curry", veg: true, price: 170 },
      { name: "Paneer Kofta", veg: true, price: 170 },
      { name: "Paneer Shahi Koorma", veg: true, price: 180 },
      { name: "Kaju Paneer Curry", veg: true, price: 180 },
      { name: "Paneer Tikka Masala", veg: true, price: 190 }
    ]
  },
  {
    category: "Roti & Breads",
    items: [
      { name: "Pulka", veg: true, price: 7 },
      { name: "Roti", veg: true, price: 30 },
      { name: "Butter Naan", veg: true, price: 40 },
      { name: "Garlic Naan", veg: true, price: 50 }
    ]
  },
  {
    category: "Beverages",
    items: [
      { name: "Thumbs Up", veg: true, sizes: { "Small": 20, "Large": 40 } },
      { name: "Coca-Cola", veg: true, price: 20 },
      { name: "Sprite", veg: true, sizes: { "Small": 20, "Large": 40 } },
      { name: "Water Bottle", veg: true, price: 20 }
    ]
  },
  {
    category: "Biryanis",
    items: [
      { name: "Chicken Dum Biryani", veg: false, price: 200 },
      { name: "Chicken Fry Piece Biryani", veg: false, price: 210 },
      { name: "Prawn Biryani", veg: false, price: 250 },
      { name: "Fish Biryani", veg: false, price: 240 },
      { name: "Sp Chicken Biryani", veg: false, price: 250 },
      { name: "Chicken Tikka Biryani", veg: false, price: 280 },
      { name: "Chicken Joint Biryani", veg: false, price: 250 },
      { name: "Sp Prawn Biryani", veg: false, price: 280 },
      { name: "Lollipop Biryani", veg: false, price: 260 },
      { name: "Chicken Mughalai Biryani", veg: false, price: 250 },
      { name: "Prawn Mughalai Biryani", veg: false, price: 270 },
      { name: "Chicken Kalmi Biryani", veg: false, price: 260 },
      { name: "Mutton Fry Biryani", veg: false, price: 300 },
      { name: "Mutton Mughalai Biryani", veg: false, price: 320 },
      { name: "Vegetable Biryani", veg: true, price: 130 },
      { name: "Mushroom Biryani", veg: true, price: 150 },
      { name: "Sp Mushroom Biryani", veg: true, price: 250 },
      { name: "Paneer Biryani", veg: true, price: 170 },
      { name: "Sp Paneer Biryani", veg: true, price: 260 }
    ]
  },
  {
    category: "Fried Rice",
    items: [
      { name: "Egg Fried Rice", veg: false, price: 130 },
      { name: "Egg Schezwan Fried Rice", veg: false, price: 140 },
      { name: "Chicken Fried Rice", veg: false, price: 200 },
      { name: "Chicken Shezwan Fried Rice", veg: false, price: 210 },
      { name: "Sp Chicken Fried Rice", veg: false, price: 250 },
      { name: "Sp Prawn Fried Rice", veg: false, sizes: { "Special": 280, "Regular": 250 } },
      { name: "Mixed Non-Veg Fried Rice", veg: false, price: 280 },
      { name: "Jeera Rice", veg: true, price: 100 },
      { name: "Veg Fried Rice", veg: true, price: 110 },
      { name: "Sp Mushroom Fried Rice", veg: true, sizes: { "Special": 250, "Regular": 140 } },
      { name: "Sp Baby Corn Fried Rice", veg: true, sizes: { "Special": 250, "Regular": 140 } },
      { name: "Corn Fried Rice", veg: true, price: 130 },
      { name: "Sp Paneer Fried Rice", veg: true, sizes: { "Special": 250, "Regular": 140 } },
      { name: "Sp Kaju Fried Rice", veg: true, sizes: { "Special": 250, "Regular": 160 } }
    ]
  }
];

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'cook', password: 'cook123', role: 'cook' },
  { username: 'waiter', password: 'waiter123', role: 'waiter' }
];

async function seedMongoDatabase() {
  try {
    const userCount = await StaffUser.countDocuments();
    if (userCount === 0) {
      await StaffUser.insertMany(DEFAULT_USERS);
    }
    const menuCount = await MenuCategory.countDocuments();
    if (menuCount === 0) {
      await MenuCategory.insertMany(INITIAL_MENU);
    }
  } catch (err) {
    console.error('Seeding MongoDB error:', err);
  }
}

// 4. JSON FILE DATABASE FALLBACK LOGIC
function readLocalDb() {
  try {
    if (fs.existsSync(jsonDbPath)) {
      const data = fs.readFileSync(jsonDbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) { }
  return seedLocalDatabase();
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local database file:', e);
  }
}

function seedLocalDatabase() {
  const defaultDb = {
    staff_users: DEFAULT_USERS,
    pending_registrations: [],
    menu: INITIAL_MENU,
    active_tabs: {},
    bills: []
  };
  writeLocalDb(defaultDb);
  return defaultDb;
}

// ==========================================
// 5. UNIFIED DATA ACCESS INTERFACE (DB WRAPPER)
// ==========================================

export const db = {
  // Check if using Mongo
  isMongo: () => useMongo,

  // MENU INTERFACES
  getMenu: async () => {
    if (useMongo) {
      return await MenuCategory.find().select('-__v');
    } else {
      return readLocalDb().menu;
    }
  },

  updateItemPrice: async (category, itemName, sizeName, newPrice) => {
    if (useMongo) {
      const catDoc = await MenuCategory.findOne({ category });
      if (!catDoc) return false;
      const item = catDoc.items.find(i => i.name === itemName);
      if (!item) return false;

      if (sizeName) {
        if (!item.sizes) item.sizes = {};
        item.sizes[sizeName] = Number(newPrice);
        catDoc.markModified('items');
      } else {
        item.price = Number(newPrice);
      }
      await catDoc.save();
      return true;
    } else {
      const data = readLocalDb();
      const cat = data.menu.find(c => c.category === category);
      if (!cat) return false;
      const item = cat.items.find(i => i.name === itemName);
      if (!item) return false;

      if (sizeName) {
        if (!item.sizes) item.sizes = {};
        item.sizes[sizeName] = Number(newPrice);
      } else {
        item.price = Number(newPrice);
      }
      writeLocalDb(data);
      return true;
    }
  },

  resetMenu: async () => {
    if (useMongo) {
      await MenuCategory.deleteMany({});
      await MenuCategory.insertMany(INITIAL_MENU);
      return true;
    } else {
      const data = readLocalDb();
      data.menu = INITIAL_MENU;
      writeLocalDb(data);
      return true;
    }
  },

  // STAFF USERS INTERFACES
  findUser: async (username, role) => {
    if (useMongo) {
      return await StaffUser.findOne({
        username: { $regex: new RegExp(`^${username}$`, 'i') },
        role
      });
    } else {
      const data = readLocalDb();
      return data.staff_users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() && u.role === role
      );
    }
  },

  findExistingRegister: async (username) => {
    if (useMongo) {
      const user = await StaffUser.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      if (user) return true;
      const req = await PendingRegistration.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      return !!req;
    } else {
      const data = readLocalDb();
      const user = data.staff_users.some(u => u.username.toLowerCase() === username.toLowerCase());
      const req = data.pending_registrations.some(r => r.username.toLowerCase() === username.toLowerCase());
      return user || req;
    }
  },

  addRegistrationRequest: async (username, password, role) => {
    if (useMongo) {
      const req = new PendingRegistration({ username, password, role });
      await req.save();
      return true;
    } else {
      const data = readLocalDb();
      data.pending_registrations.push({
        _id: Date.now().toString(),
        username,
        password,
        role,
        requestedAt: new Date().toISOString()
      });
      writeLocalDb(data);
      return true;
    }
  },

  getPendingRegistrations: async () => {
    if (useMongo) {
      return await PendingRegistration.find().sort({ requestedAt: 1 });
    } else {
      return readLocalDb().pending_registrations;
    }
  },

  approveRegistration: async (id) => {
    if (useMongo) {
      const reqLog = await PendingRegistration.findById(id);
      if (!reqLog) return false;
      const newUser = new StaffUser({
        username: reqLog.username,
        password: reqLog.password,
        role: reqLog.role
      });
      await newUser.save();
      await PendingRegistration.findByIdAndDelete(id);
      return true;
    } else {
      const data = readLocalDb();
      const idx = data.pending_registrations.findIndex(r => r._id === id);
      if (idx === -1) return false;
      const req = data.pending_registrations[idx];
      data.staff_users.push({
        username: req.username,
        password: req.password,
        role: req.role
      });
      data.pending_registrations.splice(idx, 1);
      writeLocalDb(data);
      return true;
    }
  },

  rejectRegistration: async (id) => {
    if (useMongo) {
      await PendingRegistration.findByIdAndDelete(id);
      return true;
    } else {
      const data = readLocalDb();
      data.pending_registrations = data.pending_registrations.filter(r => r._id !== id);
      writeLocalDb(data);
      return true;
    }
  },

  getUsers: async () => {
    if (useMongo) {
      return await StaffUser.find().select('-__v');
    } else {
      return readLocalDb().staff_users;
    }
  },

  deleteUser: async (username) => {
    if (useMongo) {
      await StaffUser.findOneAndDelete({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      return true;
    } else {
      const data = readLocalDb();
      data.staff_users = data.staff_users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      writeLocalDb(data);
      return true;
    }
  },

  createDirectUser: async (username, password, role) => {
    if (useMongo) {
      const newUser = new StaffUser({ username, password, role });
      await newUser.save();
      return true;
    } else {
      const data = readLocalDb();
      data.staff_users.push({ username, password, role });
      writeLocalDb(data);
      return true;
    }
  },

  // ROOM TABS INTERFACES
  getTabs: async () => {
    if (useMongo) {
      const list = await ActiveTab.find();
      const map = {};
      list.forEach(t => {
        map[t.roomId] = { roomId: t.roomId, items: t.items, createdAt: t.createdAt };
      });
      return map;
    } else {
      return readLocalDb().active_tabs;
    }
  },

  saveTab: async (roomId, items) => {
    if (useMongo) {
      let tab = await ActiveTab.findOne({ roomId });
      if (tab) {
        tab.items = items;
      } else {
        tab = new ActiveTab({ roomId, items });
      }
      await tab.save();
      return tab;
    } else {
      const data = readLocalDb();
      data.active_tabs[roomId] = {
        roomId,
        items,
        createdAt: data.active_tabs[roomId]?.createdAt || new Date().toISOString()
      };
      writeLocalDb(data);
      return data.active_tabs[roomId];
    }
  },

  markItemDone: async (roomId, lineId) => {
    if (useMongo) {
      const tab = await ActiveTab.findOne({ roomId });
      if (!tab) return null;
      const item = tab.items.find(i => i.lineId === lineId);
      if (item) {
        item.done = true;
        await tab.save();
        return tab;
      }
      return null;
    } else {
      const data = readLocalDb();
      const tab = data.active_tabs[roomId];
      if (!tab) return null;
      const item = tab.items.find(i => i.lineId === lineId);
      if (item) {
        item.done = true;
        writeLocalDb(data);
        return tab;
      }
      return null;
    }
  },

  placeOrder: async (roomId) => {
    if (useMongo) {
      const tab = await ActiveTab.findOne({ roomId });
      if (!tab) return null;
      tab.items.forEach(item => {
        item.sentToCook = true;
      });
      await tab.save();
      return tab;
    } else {
      const data = readLocalDb();
      const tab = data.active_tabs[roomId];
      if (!tab) return null;
      tab.items.forEach(item => {
        item.sentToCook = true;
      });
      writeLocalDb(data);
      return tab;
    }
  },

  markItemServed: async (roomId, lineId, served) => {
    if (useMongo) {
      const tab = await ActiveTab.findOne({ roomId });
      if (!tab) return null;
      const item = tab.items.find(i => i.lineId === lineId);
      if (item) {
        item.served = served;
        await tab.save();
        return tab;
      }
      return null;
    } else {
      const data = readLocalDb();
      const tab = data.active_tabs[roomId];
      if (!tab) return null;
      const item = tab.items.find(i => i.lineId === lineId);
      if (item) {
        item.served = served;
        writeLocalDb(data);
        return tab;
      }
      return null;
    }
  },

  deleteTab: async (roomId) => {
    if (useMongo) {
      await ActiveTab.findOneAndDelete({ roomId });
      return true;
    } else {
      const data = readLocalDb();
      delete data.active_tabs[roomId];
      writeLocalDb(data);
      return true;
    }
  },

  // BILLS INTERFACES
  getBills: async () => {
    if (useMongo) {
      return await Bill.find().sort({ completedAt: -1 });
    } else {
      return readLocalDb().bills;
    }
  },

  addBill: async (billData) => {
    if (useMongo) {
      const newBill = new Bill({
        id: billData.id,
        roomId: billData.roomId,
        items: billData.items,
        notes: billData.notes,
        createdAt: new Date(billData.createdAt),
        total: billData.total
      });
      await newBill.save();
      return newBill;
    } else {
      const data = readLocalDb();
      data.bills.unshift(billData); // Add to beginning (latest first)
      writeLocalDb(data);
      return billData;
    }
  }
};
