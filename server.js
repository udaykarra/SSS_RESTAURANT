import express from 'express';
import cors from 'cors';
import { db } from './database.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. AUTHENTICATION & STAFF ACCOUNTS APIs
// ==========================================

// Login Handler
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = await db.findUser(username, role);
    if (user && user.password === password) {
      return res.json({ success: true, username: user.username, role: user.role });
    }
    return res.status(401).json({ error: 'Invalid username or password for this role.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server authentication error.' });
  }
});

// Submit Registration Request (Customer/Guest facing link)
app.post('/api/auth/register-request', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const exists = await db.findExistingRegister(username);
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken or pending approval.' });
    }

    await db.addRegistrationRequest(username, password, role);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Registration request failed.' });
  }
});

// Get Pending Registrations (Admin Only)
app.get('/api/auth/pending', async (req, res) => {
  try {
    const requests = await db.getPendingRegistrations();
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
});

// Approve Pending Registration (Admin Only)
app.post('/api/auth/approve', async (req, res) => {
  const { id } = req.body;
  try {
    const success = await db.approveRegistration(id);
    if (success) {
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Request not found.' });
  } catch (err) {
    return res.status(500).json({ error: 'Approval failed.' });
  }
});

// Reject Pending Registration (Admin Only)
app.post('/api/auth/reject', async (req, res) => {
  const { id } = req.body;
  try {
    await db.rejectRegistration(id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Rejection failed.' });
  }
});

// Get Active Staff List (Admin Only)
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch active staff.' });
  }
});

// Delete Staff Member (Admin Only)
app.delete('/api/auth/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    await db.deleteUser(username);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Deletion failed.' });
  }
});

// Direct Staff Account Creation (Admin Only)
app.post('/api/auth/register-direct', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const exists = await db.findExistingRegister(username);
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    await db.createDirectUser(username, password, role);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Creation failed.' });
  }
});

// ==========================================
// 2. MENU APIs
// ==========================================

// Get Full Menu
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await db.getMenu();
    return res.json(menu);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch menu.' });
  }
});

// Update Item Price Directly (Admin Only)
app.post('/api/menu/price', async (req, res) => {
  const { category, itemName, sizeName, newPrice } = req.body;
  try {
    const success = await db.updateItemPrice(category, itemName, sizeName, newPrice);
    if (success) {
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Item not found.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update menu price.' });
  }
});

// Reset Menu Overrides (Admin Only)
app.post('/api/menu/reset', async (req, res) => {
  try {
    await db.resetMenu();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset menu.' });
  }
});

// ==========================================
// 3. RUNNING ROOM TABS APIs
// ==========================================

// Fetch All Running Tabs
app.get('/api/tabs', async (req, res) => {
  try {
    const tabsMap = await db.getTabs();
    return res.json(tabsMap);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch active tabs.' });
  }
});

// Set / Update Active Room Tab
app.post('/api/tabs/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { items } = req.body;
  try {
    const tab = await db.saveTab(roomId, items);
    return res.json(tab);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save active tab.' });
  }
});

// Mark Individual Cook Item portion as Done
app.post('/api/tabs/:roomId/item-done', async (req, res) => {
  const { roomId } = req.params;
  const { lineId } = req.body;
  try {
    const tab = await db.markItemDone(roomId, lineId);
    if (tab) {
      return res.json(tab);
    }
    return res.status(404).json({ error: 'Item not found inside tab.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update item.' });
  }
});

// Mark all pending items in the active tab as sent to cook
app.post('/api/tabs/:roomId/place-order', async (req, res) => {
  const { roomId } = req.params;
  try {
    const tab = await db.placeOrder(roomId);
    if (tab) {
      return res.json(tab);
    }
    return res.status(404).json({ error: 'Active tab not found.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to place order.' });
  }
});

// Mark Individual Item portion as Served / Unserved
app.post('/api/tabs/:roomId/item-served', async (req, res) => {
  const { roomId } = req.params;
  const { lineId, served } = req.body;
  try {
    const tab = await db.markItemServed(roomId, lineId, served);
    if (tab) {
      return res.json(tab);
    }
    return res.status(404).json({ error: 'Item not found inside tab.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update item served status.' });
  }
});

// Settle / Delete Tab
app.delete('/api/tabs/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    await db.deleteTab(roomId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete tab.' });
  }
});

// ==========================================
// 4. SETTLED BILLS APIs
// ==========================================

// Fetch Bills Log
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await db.getBills();
    return res.json(bills);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

// Add Permanent Bill
app.post('/api/bills', async (req, res) => {
  try {
    const bill = await db.addBill(req.body);
    return res.json(bill);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to finalize bill.' });
  }
});

// Start listening on port 3001
app.listen(port, '0.0.0.0', () => {
  const mode = db.isMongo() ? 'MongoDB Mode' : 'Local JSON Fallback Mode';
  console.log(`Express API Server running at http://0.0.0.0:${port} using [${mode}]`);
});
