import React, { useState, useEffect, useRef } from 'react';
import CustomerView from './views/CustomerView.jsx';
import LoginView from './views/LoginView.jsx';
import AdminView from './views/AdminView.jsx';

// Play double-chime Web Audio sound (completely client-side & offline)
export const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // First chime (D5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.45);
    
    // Second chime (A5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.55);
  } catch (e) {
    console.warn("Audio Context playback blocked or failed:", e);
  }
};

export default function App() {
  // Routing states
  const [currentRoomId, setCurrentRoomId] = useState(null); // '1'-'6', 'takeaway'
  const [staffRoute, setStaffRoute] = useState(false); // true if staff portal
  const [staffTab, setStaffTab] = useState('rooms'); // 'rooms' | 'stats' | 'menu' | 'users' | 'qr'
  
  // Database states
  const [menu, setMenu] = useState([]);
  const [activeRoomTabs, setActiveRoomTabs] = useState({});
  const [bills, setBills] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  
  // Auth states
  const [role, setRole] = useState(null); // 'admin' | 'cook' | 'waiter'
  const [staffName, setStaffName] = useState('');
  
  // App UX states
  const [toasts, setToasts] = useState([]);
  const [selectedStaffRoom, setSelectedStaffRoom] = useState(null);
  
  // Auto-sync polling references
  const prevTabsRef = useRef({});
  const initialLoadRef = useRef(false);

  // Show Toast Helper
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 1. Initial Load & Routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const staffParam = params.get('staff');

    if (roomParam) {
      setCurrentRoomId(roomParam);
    } else if (staffParam === 'login' || staffParam === 'dashboard') {
      setStaffRoute(true);
    }

    // Load auth session from sessionStorage
    const savedRole = sessionStorage.getItem('sss_staff_role');
    const savedName = sessionStorage.getItem('sss_staff_name');
    if (savedRole) {
      setRole(savedRole);
      setStaffName(savedName || savedRole);
    }

    // Fetch initial database structures
    fetchMenuData();
    pollServerData();
    initialLoadRef.current = true;
  }, []);

  // 2. Fetch Menu Configuration
  const fetchMenuData = async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        setMenu(data);
      }
    } catch (e) {
      console.error("Error fetching menu:", e);
    }
  };

  // 3. Centralized Polling Engine (Every 3 seconds)
  const pollServerData = async () => {
    try {
      // Parallel fetches for tables, bills, and auth approvals
      const [tabsRes, billsRes] = await Promise.all([
        fetch('/api/tabs'),
        fetch('/api/bills')
      ]);

      if (tabsRes.ok) {
        const freshTabs = await tabsRes.json();
        
        // Detect database changes for alerts (Order chime & Cook done chime)
        if (initialLoadRef.current) {
          detectTabChanges(prevTabsRef.current, freshTabs);
        }
        
        setActiveRoomTabs(freshTabs);
        prevTabsRef.current = freshTabs;
      }

      if (billsRes.ok) {
        const freshBills = await billsRes.json();
        setBills(freshBills);
      }

      // If logged in as admin, poll approvals and user lists
      const savedRole = sessionStorage.getItem('sss_staff_role');
      if (savedRole === 'admin') {
        const [pendingRes, usersRes] = await Promise.all([
          fetch('/api/auth/pending'),
          fetch('/api/auth/users')
        ]);
        if (pendingRes.ok) {
          const freshPending = await pendingRes.json();
          setPendingRegistrations(freshPending);
        }
        if (usersRes.ok) {
          const freshUsers = await usersRes.json();
          setStaffUsers(freshUsers);
        }
      }
    } catch (e) {
      console.warn("Server polling failed:", e);
    }
  };

  useEffect(() => {
    const timer = setInterval(pollServerData, 3000);
    return () => clearInterval(timer);
  }, [role]);

  // 4. Sound Alerts and Notification Detector
  const detectTabChanges = (oldTabs, newTabs) => {
    const rooms = ['1', '2', '3', '4', '5', '6', 'takeaway'];
    const savedRole = sessionStorage.getItem('sss_staff_role');
    const isCook = savedRole === 'cook';
    const isWaiterOrAdmin = savedRole === 'waiter' || savedRole === 'admin';
    
    let cookAlert = false;
    let newOrderPlaced = false;
    let cookedPortionAlert = null;

    for (const rId of rooms) {
      const oldTab = oldTabs[rId];
      const newTab = newTabs[rId];

      if (newTab && newTab.items && newTab.items.length > 0) {
        const oldItems = oldTab ? oldTab.items : [];
        const newItems = newTab.items;

        // Cook alert: count items sent to cook but not done
        const oldUncooked = oldItems.filter(i => i.sentToCook && !i.done).reduce((sum, i) => sum + i.qty, 0);
        const newUncooked = newItems.filter(i => i.sentToCook && !i.done).reduce((sum, i) => sum + i.qty, 0);
        if (newUncooked > oldUncooked) {
          cookAlert = true;
        }

        // Waiter/Admin alerts
        if (isWaiterOrAdmin) {
          const oldQty = oldItems.reduce((sum, i) => sum + i.qty, 0);
          const newQty = newItems.reduce((sum, i) => sum + i.qty, 0);
          if (newQty > oldQty) {
            newOrderPlaced = true;
          }

          newItems.forEach(newItem => {
            const oldItem = oldItems.find(i => i.lineId === newItem.lineId);
            if (newItem.done && (!oldItem || !oldItem.done)) {
              cookedPortionAlert = `Room ${rId === 'takeaway' ? 'Takeaway' : rId}: ${newItem.name} is cooked! 👨‍🍳`;
            }
          });
        }
      }
    }

    if (isCook && cookAlert) {
      playNotificationSound();
      showToast("🔔 New kitchen order received!");
    } else if (isWaiterOrAdmin) {
      if (newOrderPlaced) {
        playNotificationSound();
        showToast("🔔 New order activity received!");
      } else if (cookedPortionAlert) {
        playNotificationSound();
        showToast(cookedPortionAlert);
      }
    }
  };

  // Navigations
  const navigateTo = (target) => {
    if (target === 'home') {
      window.history.pushState({}, '', '/');
      setCurrentRoomId(null);
      setStaffRoute(false);
    } else if (target === 'staff=login') {
      window.history.pushState({}, '', '/?staff=login');
      setStaffRoute(true);
    } else if (target === 'staff=dashboard') {
      window.history.pushState({}, '', '/?staff=dashboard');
      setStaffRoute(true);
    }
  };

  return (
    <div className="app-root-wrapper">
      {/* Toast Alert list */}
      <div id="toast-wrapper">
        {toasts.map(t => (
          <div key={t.id} className="toast-item">
            <span className="toast-dot">●</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Main view switcher */}
      {staffRoute ? (
        role ? (
          <div className="staff-dashboard">
            <header className="header no-print">
              <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src="/logo.jpg" 
                    alt="SSS Logo" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }} 
                  />
                  <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      SSS Family Restaurant
                      <span style={{ fontSize: '13px', fontWeight: 'normal', opacity: 0.8, color: 'var(--text-muted)' }}>
                        📞 9985177939
                      </span>
                    </h1>
                    <p style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Beside Reliance Smart, Ranastalam</span>
                      <span style={{ color: 'var(--text-muted)' }}>|</span>
                      <span>Staff: <strong style={{ textTransform: 'uppercase', color: 'var(--primary)' }}>{staffName} ({role})</strong></span>
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="live-pill">
                    <span className="dot"></span>
                    <span>LIVE</span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    sessionStorage.clear();
                    setRole(null);
                    setStaffName('');
                    navigateTo('home');
                  }}>Logout</button>
                </div>
              </div>
            </header>

            <div className="staff-nav no-print">
              <div className="staff-nav-inner" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {selectedStaffRoom && staffTab === 'rooms' && (
                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={() => setSelectedStaffRoom(null)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}
                  >
                    ← Back
                  </button>
                )}
                <div className={`nav-tab ${staffTab === 'rooms' ? 'active' : ''}`} onClick={() => setStaffTab('rooms')}>
                  DineIN
                  {Object.keys(activeRoomTabs).length > 0 && (
                    <span className="nav-badge">{Object.keys(activeRoomTabs).length}</span>
                  )}
                </div>
                {role === 'admin' && (
                  <>
                    <div className={`nav-tab ${staffTab === 'stats' ? 'active' : ''}`} onClick={() => setStaffTab('stats')}>Sales Statistics</div>
                    <div className={`nav-tab ${staffTab === 'menu' ? 'active' : ''}`} onClick={() => setStaffTab('menu')}>Price Overrides</div>
                    <div className={`nav-tab ${staffTab === 'users' ? 'active' : ''}`} onClick={() => setStaffTab('users')}>
                      Staff Accounts
                      {pendingRegistrations.length > 0 && (
                        <span className="nav-badge-alert">{pendingRegistrations.length}</span>
                      )}
                    </div>
                  </>
                )}
                {role === 'admin' && (
                  <div className={`nav-tab ${staffTab === 'qr' ? 'active' : ''}`} onClick={() => setStaffTab('qr')}>Table QR Codes</div>
                )}
              </div>
            </div>

            <main className="container">
              {staffTab === 'rooms' && (
                <div className="fade-in">
                  {selectedStaffRoom ? (
                    <RoomDetailView 
                      roomId={selectedStaffRoom} 
                      role={role} 
                      tab={activeRoomTabs[selectedStaffRoom]}
                      menu={menu}
                      onBack={() => setSelectedStaffRoom(null)}
                      showToast={showToast}
                      pollServerData={pollServerData}
                      onSaveTab={async (items) => {
                        const res = await fetch(`/api/tabs/${selectedStaffRoom}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ items })
                        });
                        if (res.ok) {
                          pollServerData();
                          showToast("Tab saved successfully!");
                        }
                      }}
                      onMarkItemDone={async (lineId) => {
                        const res = await fetch(`/api/tabs/${selectedStaffRoom}/item-done`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lineId })
                        });
                        if (res.ok) {
                          pollServerData();
                          showToast("Item marked as cooked!");
                        }
                      }}
                      onCheckout={async (billData) => {
                        const resBill = await fetch('/api/bills', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(billData)
                        });
                        if (resBill.ok) {
                          await fetch(`/api/tabs/${selectedStaffRoom}`, { method: 'DELETE' });
                          setSelectedStaffRoom(null);
                          pollServerData();
                          showToast("Bill settled and table cleared!");
                        }
                      }}
                    />
                  ) : (
                    <RoomsGrid 
                      activeRoomTabs={activeRoomTabs} 
                      role={role}
                      onSelectRoom={setSelectedStaffRoom}
                    />
                  )}
                </div>
              )}
              {staffTab === 'stats' && role === 'admin' && <AdminView viewsTab="stats" bills={bills} menu={menu} />}
              {staffTab === 'menu' && role === 'admin' && <AdminView viewsTab="menu" menu={menu} onRefreshMenu={fetchMenuData} />}
              {staffTab === 'users' && role === 'admin' && (
                <AdminView 
                  viewsTab="users" 
                  staffUsers={staffUsers} 
                  pendingRegistrations={pendingRegistrations} 
                  onRefreshUsers={pollServerData}
                  showToast={showToast}
                />
              )}
              {staffTab === 'qr' && role === 'admin' && <AdminView viewsTab="qr" />}
            </main>
          </div>
        ) : (
          <LoginView onLoginSuccess={(userRole, name) => {
            setRole(userRole);
            setStaffName(name);
            sessionStorage.setItem('sss_staff_role', userRole);
            sessionStorage.setItem('sss_staff_name', name);
            setStaffTab('rooms');
            navigateTo('staff=dashboard');
            pollServerData();
          }} showToast={showToast} />
        )
      ) : (
        <CustomerView 
          roomId={currentRoomId} 
          menu={menu}
          activeTab={currentRoomId ? activeRoomTabs[currentRoomId] : null}
          onOrderSubmit={async (items) => {
            const res = await fetch(`/api/tabs/${currentRoomId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items })
            });
            if (res.ok) {
              pollServerData();
              showToast("👨‍🍳 Order placed! Cooking in progress.");
            }
          }}
          onStaffPortalClick={() => navigateTo('staff=login')}
        />
      )}
    </div>
  );
}

// ------------------------------------------
// STAFF SUB-VIEWS: ROOMS GRID & DETAIL VIEW
// ------------------------------------------

const ROOM_COLORS = {
  '1': { name: 'Room 1', color: '#b83b5e', lightColor: '#f9edf3', border: '#f3c6d5', darkColor: '#621025' },
  '2': { name: 'Room 2', color: '#3f72af', lightColor: '#f0f4f8', border: '#c3d6eb', darkColor: '#173f5f' },
  '3': { name: 'Room 3', color: '#e27474', lightColor: '#fef1f1', border: '#fbd3d3', darkColor: '#781d1d' },
  '4': { name: 'Room 4', color: '#2d6a4f', lightColor: '#edf7f4', border: '#b7dfd0', darkColor: '#10392b' },
  '5': { name: 'Room 5', color: '#833ab4', lightColor: '#f6effa', border: '#e8d2f7', darkColor: '#431366' },
  '6': { name: 'Room 6', color: '#e67e22', lightColor: '#fdf2e9', border: '#fad7b7', darkColor: '#7d3c00' },
  'takeaway': { name: 'Takeaway', color: '#16a085', lightColor: '#e8f8f5', border: '#a3e4d7', darkColor: '#0b5345' }
};

function RoomsGrid({ activeRoomTabs, role, onSelectRoom }) {
  const rooms = ['1', '2', '3', '4', '5', '6', 'takeaway'];
  const isCook = role === 'cook';

  return (
    <div className="rooms-grid fade-in">
      {rooms.map(rId => {
        const roomColor = ROOM_COLORS[rId];
        const tab = activeRoomTabs[rId];
        
        let isActive = false;
        let statusText = 'Ready for guests';
        let totalAmount = 0;

        if (tab && tab.items && tab.items.length > 0) {
          if (isCook) {
            const cookItems = tab.items.filter(i => i.sentToCook);
            const totalPending = cookItems.filter(i => !i.done).reduce((sum, i) => sum + i.qty, 0);
            
            isActive = totalPending > 0;
            statusText = isActive 
              ? `${totalPending} items yet to cook` 
              : 'Ready for guests';
          } else {
            const itemCount = tab.items.reduce((sum, i) => sum + i.qty, 0);
            const totalServed = tab.items.filter(i => i.served).reduce((sum, i) => sum + i.qty, 0);
            const totalYetToServe = tab.items.filter(i => !i.served).reduce((sum, i) => sum + i.qty, 0);
            totalAmount = tab.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
            
            isActive = itemCount > 0;
            statusText = `${itemCount} items ordered (${totalServed} Served / ${totalYetToServe} Yet to Serve)`;
          }
        }

        return (
          <div 
            key={rId}
            className={`room-card ${isActive ? 'active' : ''}`}
            style={{
              '--room-accent': roomColor.color,
              '--room-text': roomColor.darkColor,
              '--room-bg': roomColor.lightColor,
              '--room-border': roomColor.border
            }}
            onClick={() => onSelectRoom(rId)}
          >
            <div className="room-card-header">
              <h3>{roomColor.name}</h3>
              <span className={`room-badge room-color-${rId}`}>{isActive ? 'Tab Open' : 'Empty'}</span>
            </div>
            <div className="room-card-body">
              <span className="room-status">{statusText}</span>
              {isActive && !isCook && (
                <span className="room-total">₹{totalAmount}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomDetailView({ roomId, role, tab, menu, onBack, onSaveTab, onMarkItemDone, onCheckout, showToast, pollServerData }) {
  const roomColor = ROOM_COLORS[roomId];
  const isActive = tab && tab.items && tab.items.length > 0;
  const isCook = role === 'cook';
  const isWaiterOrAdmin = role === 'waiter' || role === 'admin';
  const grandTotal = isActive ? tab.items.reduce((sum, i) => sum + (i.price * i.qty), 0) : 0;

  // POS Add variables
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('');
  const [posVegFilter, setPosVegFilter] = useState('veg'); // 'veg' | 'non-veg'
  const [showReceiptBill, setShowReceiptBill] = useState(null);
  const [detailSubTab, setDetailSubTab] = useState('selected'); // 'selected' | 'placed'

  // Filter items based on role
  const cookItems = tab && tab.items ? tab.items.filter(i => i.sentToCook) : [];
  const stagedItems = tab && tab.items ? tab.items.filter(i => i.sentToCook === false) : [];
  const placedItems = tab && tab.items ? tab.items.filter(i => i.sentToCook !== false) : [];

  const itemsToShow = isCook 
    ? cookItems 
    : (detailSubTab === 'selected' ? stagedItems : placedItems);

  const selectedCount = stagedItems.length;
  const placedCount = placedItems.length;

  const hasUnplacedItems = isActive && stagedItems.length > 0;
  const showEmpty = isCook 
    ? cookItems.length === 0 
    : (detailSubTab === 'selected' ? selectedCount === 0 : placedCount === 0);



  // Auto-select first category in menu
  useEffect(() => {
    if (menu && menu.length > 0) {
      const firstCat = menu[0].category;
      setPosCategory(firstCat);
      if (firstCat === 'Roti & Breads' || firstCat === 'Beverages') {
        setPosVegFilter('all');
      } else {
        setPosVegFilter('veg');
      }
    }
  }, [menu]);

  const handlePosCategoryChange = (catName) => {
    setPosCategory(catName);
    if (catName === 'Roti & Breads' || catName === 'Beverages') {
      setPosVegFilter('all');
    } else if (posVegFilter === 'all') {
      setPosVegFilter('veg');
    }
  };

  if (showReceiptBill) {
    return (
      <div className="checkout-summary-page fade-in" style={{ paddingBottom: '60px' }}>
        <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowReceiptBill(null)}>
            ← Back to Room Tab
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            Print Receipt 🖨️
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {/* Summary Details */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <img 
                src="/logo.jpg" 
                alt="SSS Logo" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }} 
              />
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '18px', margin: 0 }}>
                Checkout Summary: {roomColor.name}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Room/Table:</span>
                <strong style={{ textTransform: 'uppercase' }}>{roomColor.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bill Reference:</span>
                <strong>#{showReceiptBill.id.slice(-6)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Items:</span>
                <strong>{showReceiptBill.items.reduce((sum, i) => sum + i.qty, 0)} portions</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Opening Time:</span>
                <strong>{new Date(showReceiptBill.createdAt).toLocaleString()}</strong>
              </div>
              {showReceiptBill.notes && (
                <div style={{ marginTop: '6px', borderTop: '1px solid var(--border-light)', paddingTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Staff Notes:</span>
                  <strong>{showReceiptBill.notes}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Invoice Card */}
          <div className="receipt-bill-card card" style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>SSS FAMILY RESTAURANT</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Beside Reliance Smart, Ranastalam</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ph: 9985177939, 8886909058</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
              <span>Bill: #{showReceiptBill.id.slice(-6)}</span>
              <span>Room: <strong style={{ textTransform: 'uppercase' }}>{roomColor.name}</strong></span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Date: {new Date(showReceiptBill.createdAt).toLocaleString()}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', textAlign: 'left', fontWeight: 'bold' }}>
                  <th style={{ padding: '6px 0' }}>Item</th>
                  <th style={{ padding: '6px 0', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {showReceiptBill.items.map(item => (
                  <tr key={item.lineId} style={{ borderBottom: '1px dashed var(--border-light)' }}>
                     <td style={{ padding: '6px 0' }}>{item.name} {item.size && `(${item.size})`}</td>
                     <td style={{ padding: '6px 0', textAlign: 'center' }}>{item.qty}</td>
                     <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{item.price * item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Grand Total:</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)' }}>₹{showReceiptBill.total}</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Thank you! Visit again.
            </div>
          </div>

          <div className="no-print" style={{ marginTop: '10px' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px' }}
              onClick={() => {
                onCheckout(showReceiptBill);
                setShowReceiptBill(null);
              }}
            >
              Complete Payment & Check out Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // POS Action
  const handlePOSAdd = (itemName, size, price, veg, category) => {
    const lineId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const items = tab ? [...tab.items] : [];
    items.push({
      lineId,
      name: itemName,
      veg,
      category,
      price,
      qty: 1,
      size: size || '',
      notes: '',
      source: 'staff',
      done: false,
      sentToCook: false, // Waiters' POS adds are unplaced by default
      served: false
    });
    onSaveTab(items);
  };

  // Modify Qty on Tab
  const updateQty = (lineId, offset) => {
    if (!tab) return;
    const items = tab.items.map(i => {
      if (i.lineId === lineId) {
        return { ...i, qty: Math.max(0, i.qty + offset) };
      }
      return i;
    }).filter(i => i.qty > 0);
    onSaveTab(items);
  };

  // Submit pending items to kitchen
  const handlePlaceOrderToKitchen = async () => {
    try {
      const res = await fetch(`/api/tabs/${roomId}/place-order`, { method: 'POST' });
      if (res.ok) {
        pollServerData();
        setDetailSubTab('placed');
        showToast("Order placed to kitchen successfully! 👨‍🍳");
      }
    } catch (e) {
      showToast("Failed to place order.");
    }
  };

  // Toggle Served status
  const handleToggleServed = async (lineId, served) => {
    try {
      if (served) {
        const item = tab.items.find(i => i.lineId === lineId);
        if (item && !item.done) {
          showToast("⚠️ Cannot mark as served: This item has not been cooked yet!");
          return;
        }
      }
      const res = await fetch(`/api/tabs/${roomId}/item-served`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, served })
      });
      if (res.ok) {
        pollServerData();
        showToast(served ? "Item marked as served!" : "Item marked as unserved.");
      }
    } catch (e) {
      showToast("Failed to update served status.");
    }
  };

  // Filter items in POS search
  const getFilteredItems = () => {
    const activeCat = menu.find(c => c.category === posCategory);
    if (!activeCat) return [];
    return activeCat.items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(posSearch.toLowerCase());
      if (posVegFilter === 'veg') return matchesSearch && i.veg;
      if (posVegFilter === 'non-veg') return matchesSearch && !i.veg;
      return matchesSearch;
    });
  };

  return (
    <div style={{ paddingBottom: isWaiterOrAdmin ? '100px' : '40px' }}>

      {/* POS Quick Add (Waiter / Admin) - Rendered ABOVE the active items list */}
      {isWaiterOrAdmin && (
        <div className="pos-panel no-print fade-in">
          <div className="menu-filters" style={{ border: 'none', boxShadow: 'none', padding: 0, marginBottom: '12px' }}>
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search menu..." 
                value={posSearch} 
                onChange={(e) => setPosSearch(e.target.value)} 
              />
            </div>
          </div>

          <div className="category-scroll" style={{ position: 'static', marginBottom: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', boxShadow: 'none' }}>
            <div className="category-scroll-inner">
              {menu.map(cat => (
                <span 
                  key={cat.category}
                  className={`chip ${posCategory === cat.category ? 'active' : ''}`}
                  onClick={() => handlePosCategoryChange(cat.category)}
                >
                  {cat.category}
                </span>
              ))}
            </div>
          </div>

          {/* POS Veg filters (HIDDEN on Breads and Beverages) */}
          {posCategory !== 'Roti & Breads' && posCategory !== 'Beverages' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button 
                className={`btn btn-sm ${posVegFilter === 'veg' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: posVegFilter === 'veg' ? 'var(--veg-color)' : '',
                  borderColor: posVegFilter === 'veg' ? 'var(--veg-color)' : '',
                  color: posVegFilter === 'veg' ? '#fff' : ''
                }}
                onClick={() => setPosVegFilter('veg')}
              >
                🟢 Pure Veg
              </button>
              <button 
                className={`btn btn-sm ${posVegFilter === 'non-veg' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: posVegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
                  borderColor: posVegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
                  color: posVegFilter === 'non-veg' ? '#fff' : ''
                }}
                onClick={() => setPosVegFilter('non-veg')}
              >
                🔴 Non-Veg
              </button>
            </div>
          )}

          <div className="menu-sections">
            {(() => {
              const items = getFilteredItems();
              const isRotiOrBeverage = posCategory === 'Roti & Breads' || posCategory === 'Beverages';
              
              const renderPOSCard = (item) => {
                const sizesList = item.sizes ? Object.entries(item.sizes) : [];
                return (
                  <div key={item.name} className="menu-item-card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {!isRotiOrBeverage && (
                          <div className={`veg-badge ${item.veg ? '' : 'non-veg'}`} style={{ width: '12px', height: '12px' }}>
                            <span className={item.veg ? 'dot' : 'triangle'} style={{ width: '4px', height: '4px' }}></span>
                          </div>
                        )}
                        {item.name}
                      </h4>
                    </div>
                    {sizesList.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sizesList.map(([sizeName, sizePrice]) => (
                          <button 
                            key={sizeName}
                            className="btn btn-outline btn-sm"
                            style={{ justifyContent: 'space-between', fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handlePOSAdd(item.name, sizeName, sizePrice, item.veg, posCategory)}
                          >
                            <span style={{ textTransform: 'capitalize' }}>{sizeName}</span>
                            <strong>₹{sizePrice}</strong>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handlePOSAdd(item.name, null, item.price, item.veg, posCategory)}
                      >
                        <strong>₹{item.price}</strong>
                      </button>
                    )}
                  </div>
                );
              };

              return (
                <div className="menu-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {items.map(renderPOSCard)}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Active items list / empty pane - Rendered BELOW the menu */}
      {isWaiterOrAdmin && isActive && (
        <div className="sub-tabs-container no-print" style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '16px', gap: '8px', padding: '0 16px' }}>
          <button 
            className={`sub-tab-btn ${detailSubTab === 'selected' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              border: 'none',
              background: 'none',
              borderBottom: detailSubTab === 'selected' ? '3px solid var(--primary)' : '3px solid transparent',
              color: detailSubTab === 'selected' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={() => setDetailSubTab('selected')}
          >
            Items Selected ({selectedCount})
          </button>
          <button 
            className={`sub-tab-btn ${detailSubTab === 'placed' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              border: 'none',
              background: 'none',
              borderBottom: detailSubTab === 'placed' ? '3px solid var(--primary)' : '3px solid transparent',
              color: detailSubTab === 'placed' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={() => setDetailSubTab('placed')}
          >
            Orders Placed ({placedCount})
          </button>
        </div>
      )}

      {showEmpty ? (
        <div className="empty-pane">
          <p>
            {isCook 
              ? 'No active kitchen tickets for this room.' 
              : (detailSubTab === 'selected' ? 'No items selected yet. Choose items from the menu above.' : 'No orders placed yet.')}
          </p>
        </div>
      ) : (
        <div className="menu-filters" style={{ padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>
            {detailSubTab === 'selected' ? 'Items Selected' : 'Orders Placed'}
          </h3>
          <div className="cart-items-list">
            {itemsToShow.map(i => (
              <div key={i.lineId} className="cart-line" style={{ opacity: i.sentToCook ? 1 : 0.7 }}>
                <div className="cart-line-details">
                  <h4 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {(i.category !== 'Roti & Breads' && i.category !== 'Beverages') && (
                      <div className={`veg-badge ${i.veg ? '' : 'non-veg'}`}>
                        <span className={i.veg ? 'dot' : 'triangle'}></span>
                      </div>
                    )}
                    {i.name} {i.size && `(${i.size})`}
                    <span className={`source-badge ${i.source}`}>{i.source === 'customer' ? 'Guest' : 'Staff'}</span>
                    {!i.sentToCook && (
                      <span className="room-badge room-color-3" style={{ fontSize: '10px' }}>Staged (Unplaced)</span>
                    )}
                  </h4>
                  {i.notes && <p className="notes-text">{i.notes}</p>}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isWaiterOrAdmin ? (
                    <>
                      <div className="stepper">
                        <button className="stepper-btn" onClick={() => updateQty(i.lineId, -1)}>-</button>
                        <span className="stepper-val">{i.qty}</span>
                        <button className="stepper-btn" onClick={() => updateQty(i.lineId, 1)}>+</button>
                      </div>
                      <span className="cart-line-price" style={{ minWidth: '50px', textAlign: 'right' }}>₹{i.price * i.qty}</span>
                      
                      {i.sentToCook && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: i.done ? 'var(--veg-color)' : 'var(--text-muted)' }}>
                            {i.done ? '👨‍🍳 Cooked' : '⏳ Prep'}
                          </span>
                          {i.done ? (
                            i.served ? (
                              <button 
                                className="btn btn-sm" 
                                style={{ padding: '3px 6px', fontSize: '11px', backgroundColor: '#d4efdf', color: '#196f3d', border: '1px solid #196f3d', borderRadius: '4px' }}
                                onClick={() => handleToggleServed(i.lineId, false)}
                              >
                                Served 🍽️ ✓
                              </button>
                            ) : (
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ padding: '3px 6px', fontSize: '11px', borderRadius: '4px' }}
                                onClick={() => handleToggleServed(i.lineId, true)}
                              >
                                Mark Served
                              </button>
                            )
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '4px' }}>
                              (Waiting Cook)
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="cook-line-qty" style={{
                        backgroundColor: i.done ? '#d4efdf' : '',
                        color: i.done ? '#196f3d' : ''
                      }}>
                        {i.qty} Portion{i.qty > 1 ? 's' : ''}
                      </span>
                      {i.done ? (
                        <span style={{ fontWeight: 700, color: 'var(--veg-color)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                          ✅ Cooked
                        </span>
                      ) : (
                        <button className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--veg-color)', padding: '4px 10px', marginLeft: '6px' }} onClick={() => onMarkItemDone(i.lineId)}>Done ✔️</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isWaiterOrAdmin && hasUnplacedItems && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px dashed var(--border-color)', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ width: '100%', maxWidth: '300px' }} onClick={handlePlaceOrderToKitchen}>
                Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settle Bill Cart Bar Footer */}
      {isWaiterOrAdmin && isActive && (
        <div className="cart-bar fade-in no-print" style={{ justifyContent: 'center' }}>
          <div className="cart-bar-content" style={{ justifyContent: 'center', width: '100%' }}>
            <button className="btn btn-primary" style={{ width: '100%', maxWidth: '400px' }} onClick={() => {
              const hasUnplaced = tab.items.some(i => i.sentToCook === false);
              const hasUnserved = tab.items.some(i => i.served !== true);
              if (hasUnplaced) {
                showToast("⚠️ Cannot generate bill: Some items have not been sent to the kitchen yet!");
                return;
              }
              if (hasUnserved) {
                showToast("⚠️ Cannot generate bill: Some items have not been served yet!");
                return;
              }

              const billData = {
                id: Date.now().toString(),
                roomId,
                items: tab.items,
                notes: tab.items.map(i => i.notes).filter(Boolean).join(', ') || '',
                createdAt: tab.createdAt || new Date().toISOString(),
                total: grandTotal
              };
              setShowReceiptBill(billData);
            }}>Generate Bill 🧾</button>
          </div>
        </div>
      )}
    </div>
  );
}
