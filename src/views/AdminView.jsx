import React, { useState, useEffect, useRef } from 'react';

export default function AdminView({ viewsTab, bills = [], menu = [], staffUsers = [], pendingRegistrations = [], onRefreshUsers, onRefreshMenu, showToast }) {

  // STATS STATE
  const [statsStartDate, setStatsStartDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });
  const [statsEndDate, setStatsEndDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // MENU EDITOR STATE
  const [menuEditorCategoryIdx, setMenuEditorCategoryIdx] = useState(0);
  const [menuVegFilter, setMenuVegFilter] = useState('veg'); // 'veg' | 'non-veg'
  const [newPrices, setNewPrices] = useState({}); // key: itemName-size, value: priceInputValue

  // USERS MANAGEMENT STATE
  const [directUser, setDirectUser] = useState('');
  const [directPass, setDirectPass] = useState('');
  const [directRole, setDirectRole] = useState('waiter');
  const [staffSubTab, setStaffSubTab] = useState('active'); // 'active' | 'pending'

  // QR STATE
  const [qrBaseOverride, setQrBaseOverride] = useState('');
  const qrCanvasRefs = useRef({});

  // 1. STATS TAB COMPUTATIONS
  const getFilteredBills = () => {
    return bills.filter(b => {
      if (!b.completedAt) return false;
      const compDate = new Date(b.completedAt);
      const offset = compDate.getTimezoneOffset();
      const localDate = new Date(compDate.getTime() - (offset * 60 * 1000));
      const compDateStr = localDate.toISOString().split('T')[0];

      if (statsStartDate && compDateStr < statsStartDate) return false;
      if (statsEndDate && compDateStr > statsEndDate) return false;
      return true;
    });
  };

  const computeStats = () => {
    const list = getFilteredBills();
    const totalSales = list.reduce((sum, b) => sum + b.total, 0);
    const orderCount = list.length;
    const aov = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

    // Best sellers
    const itemSales = {};
    list.forEach(b => {
      b.items.forEach(item => {
        const itemKey = item.name + (item.size ? ` (${item.size})` : '');
        itemSales[itemKey] = (itemSales[itemKey] || 0) + item.qty;
      });
    });

    const sortedItemSales = Object.entries(itemSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return { totalSales, orderCount, aov, sortedItemSales };
  };

  const stats = computeStats();

  // 2. MENU OVERRIDES HANDLERS
  const handleSavePrice = async (category, itemName, sizeName, inputVal) => {
    if (!inputVal || isNaN(inputVal)) {
      alert("Please enter a valid numeric price.");
      return;
    }

    try {
      const res = await fetch('/api/menu/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          itemName,
          sizeName,
          newPrice: Number(inputVal)
        })
      });

      if (res.ok) {
        onRefreshMenu();
        showToast(`Updated price of ${itemName} successfully!`);
      } else {
        alert("Failed to save price.");
      }
    } catch (e) {
      alert("Error saving price.");
    }
  };

  const handleResetMenu = async () => {
    if (!confirm("Are you sure you want to reset all item prices to original physical menu card values? This will wipe your database price customizations.")) return;
    try {
      const res = await fetch('/api/menu/reset', { method: 'POST' });
      if (res.ok) {
        onRefreshMenu();
        showToast("Menu successfully reset to seeded defaults!");
      }
    } catch (e) {
      alert("Error resetting menu.");
    }
  };

  // 3. STAFF USERS HANDLERS
  const handleDirectRegister = async (e) => {
    e.preventDefault();
    if (!directUser.trim() || !directPass) return;

    try {
      const res = await fetch('/api/auth/register-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: directUser.trim(),
          password: directPass,
          role: directRole
        })
      });

      if (res.ok) {
        setDirectUser('');
        setDirectPass('');
        onRefreshUsers();
        setStaffSubTab('active');
        showToast(`Directly registered "${directUser}" successfully!`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to register staff.");
      }
    } catch (err) {
      alert("Error creating staff account.");
    }
  };

  const handleApproveReq = async (id, username) => {
    try {
      const res = await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        onRefreshUsers();
        showToast(`Approved registration request for "${username}"!`);
      }
    } catch (e) {
      alert("Approval error.");
    }
  };

  const handleRejectReq = async (id, username) => {
    try {
      const res = await fetch('/api/auth/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        onRefreshUsers();
        showToast(`Rejected request for "${username}".`);
      }
    } catch (e) {
      alert("Rejection error.");
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete the staff account for "${username}"?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${username}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshUsers();
        showToast(`Deleted staff account for "${username}".`);
      }
    } catch (e) {
      alert("Error deleting user.");
    }
  };

  // 4. QR CODE SHEET RENDER
  const ROOM_COLORS = {
    '1': { name: 'Room 1', color: '#b83b5e' },
    '2': { name: 'Room 2', color: '#3f72af' },
    '3': { name: 'Room 3', color: '#e27474' },
    '4': { name: 'Room 4', color: '#2d6a4f' },
    '5': { name: 'Room 5', color: '#833ab4' },
    '6': { name: 'Room 6', color: '#e67e22' },
    'takeaway': { name: 'Takeaway', color: '#16a085' }
  };

  const rooms = ['1', '2', '3', '4', '5', '6', 'takeaway'];

  // Redraw QR code canvases when URL override input changes
  useEffect(() => {
    if (viewsTab !== 'qr') return;

    const base = qrBaseOverride || window.location.origin;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const path = window.location.pathname;
    const fullBase = cleanBase.includes('://') ? cleanBase : `http://${cleanBase}`;

    rooms.forEach(rId => {
      const canvas = qrCanvasRefs.current[rId];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const roomInfo = ROOM_COLORS[rId];
      const targetUrl = `${fullBase}${path}?room=${rId}`;

      // Reset / Draw white card background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 520);

      // Card border color matches room accent color
      ctx.strokeStyle = roomInfo.color;
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 386, 506);

      // Branded Header banner block
      ctx.fillStyle = roomInfo.color;
      ctx.fillRect(14, 14, 372, 85);

      // SSS Restaurant text title inside banner
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SSS FAMILY RESTAURANT', 200, 50);
      ctx.font = '600 12px "Inter", sans-serif';
      ctx.fillText('Beside Reliance Smart, Ranastalam', 200, 78);

      // QR Code placeholder layout (drawing using CDN QRious)
      const qrCanvasTemp = document.createElement('canvas');
      if (window.QRious) {
        new window.QRious({
          element: qrCanvasTemp,
          value: targetUrl,
          size: 260,
          level: 'H',
          foreground: '#1b1b22',
          background: '#ffffff'
        });
        ctx.drawImage(qrCanvasTemp, 70, 130);
      } else {
        // Fallback placeholder text if CDN fails
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(70, 130, 260, 260);
        ctx.fillStyle = '#ff0000';
        ctx.font = '14px "Inter"';
        ctx.fillText('QRious library not loaded', 200, 260);
      }

      // Room table label footer
      ctx.fillStyle = '#1b1b22';
      ctx.font = '900 24px "Outfit", sans-serif';
      ctx.fillText(roomInfo.name.toUpperCase(), 200, 440);
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '600 12px "Inter", sans-serif';
      ctx.fillText('Scan QR to Order Food Directly', 200, 474);
    });
  }, [viewsTab, qrBaseOverride]);

  const downloadQR = (roomId) => {
    const canvas = qrCanvasRefs.current[roomId];
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `SSS_Restaurant_QR_${ROOM_COLORS[roomId].name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ==========================================
  // RENDER TAB VIEW SUB-SECTIONS
  // ==========================================

  // 1. SALES STATISTICS VIEW
  if (viewsTab === 'stats') {
    return (
      <div className="fade-in" style={{ paddingBottom: '40px' }}>
        {/* Date Range Selector */}
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>From Date</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
              value={statsStartDate}
              onChange={(e) => setStatsStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>To Date</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '150px', padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
              value={statsEndDate}
              onChange={(e) => setStatsEndDate(e.target.value)}
            />
          </div>
          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 12px' }}
              onClick={() => {
                const d = new Date();
                const offset = d.getTimezoneOffset();
                const todayStr = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                setStatsStartDate(todayStr);
                setStatsEndDate(todayStr);
              }}
            >
              ☀️ Today
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 12px' }}
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const offset = d.getTimezoneOffset();
                const yesterdayStr = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                setStatsStartDate(yesterdayStr);
                setStatsEndDate(yesterdayStr);
              }}
            >
              ◀️ Yesterday
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 12px' }}
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                const offset = d.getTimezoneOffset();
                const pastStr = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                const today = new Date();
                const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60 * 1000)).toISOString().split('T')[0];
                setStatsStartDate(pastStr);
                setStatsEndDate(todayStr);
              }}
            >
              🗓️ Last 30 Days
            </button>
          </div>
        </div>

        {/* Audit Cards Grid */}
        <div className="stats-summary" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <p>Total Revenue</p>
            <p style={{ color: 'var(--primary)', fontWeight: 900 }}>₹{stats.totalSales}</p>
          </div>
          <div className="stat-card">
            <p>Total Sales count</p>
            <p>{stats.orderCount}</p>
          </div>
        </div>

        {/* Item Sales Rank Table */}
        <div className="card" style={{ padding: '18px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '12px' }}>
            📊 Items Sold
          </h3>
          {stats.sortedItemSales.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sales recorded for this period.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                    <th style={{ padding: '8px' }}>Rank</th>
                    <th style={{ padding: '8px' }}>Item Name</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sortedItemSales.map((item, idx) => (
                    <tr key={item.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>#{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>
    );
  }

  // 2. MENU OVERRIDES VIEW
  if (viewsTab === 'menu') {
    return (
      <div className="fade-in" style={{ paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Type of Items Veg Filter Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            className={`btn btn-sm ${menuVegFilter === 'veg' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              backgroundColor: menuVegFilter === 'veg' ? 'var(--veg-color)' : '',
              borderColor: menuVegFilter === 'veg' ? 'var(--veg-color)' : '',
              color: menuVegFilter === 'veg' ? '#fff' : '',
              padding: '8px 16px',
              fontSize: '13px'
            }}
            onClick={() => setMenuVegFilter('veg')}
          >
            🟢 Pure Veg
          </button>
          <button
            className={`btn btn-sm ${menuVegFilter === 'non-veg' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              backgroundColor: menuVegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
              borderColor: menuVegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
              color: menuVegFilter === 'non-veg' ? '#fff' : '',
              padding: '8px 16px',
              fontSize: '13px'
            }}
            onClick={() => setMenuVegFilter('non-veg')}
          >
            🔴 Non-Veg
          </button>
        </div>

        {/* Categories Tab Selector (Scrollable, side-by-side like home page menu) */}
        <div className="category-scroll" style={{ position: 'static', marginBottom: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', boxShadow: 'none' }}>
          <div className="category-scroll-inner">
            {menu.map((cat, idx) => (
              <span
                key={cat.category}
                className={`chip ${menuEditorCategoryIdx === idx ? 'active' : ''}`}
                onClick={() => setMenuEditorCategoryIdx(idx)}
              >
                {cat.category}
              </span>
            ))}
          </div>
        </div>

        {menu.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No items found.</p>
        ) : (
          (() => {
            const catDoc = menu[menuEditorCategoryIdx];
            if (!catDoc) return <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No category selected.</p>;

            const filteredItems = catDoc.items.filter(item => {
              if (catDoc.category === 'Roti & Breads' || catDoc.category === 'Beverages') return true;
              if (menuVegFilter === 'veg') return item.veg;
              if (menuVegFilter === 'non-veg') return !item.veg;
              return true;
            });

            return (
              <div className="card" style={{ padding: '18px' }}>
                
                {filteredItems.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
                    No items matching the selected type.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          <th style={{ padding: '10px' }}>Dish Name</th>
                          <th style={{ padding: '10px' }}>Current Price</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Set New Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map(item => {
                          const sizesList = item.sizes ? Object.entries(item.sizes) : [];

                          if (sizesList.length > 0) {
                            return sizesList.map(([sizeName, priceVal]) => {
                              const inputKey = `${item.name}-${sizeName}`;
                              const curPriceInput = newPrices[inputKey] || '';

                              return (
                                <tr key={inputKey} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                  <td style={{ padding: '10px', fontWeight: 700 }}>
                                    {item.name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '12px' }}>({sizeName})</span>
                                  </td>
                                  <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{priceVal}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>₹</span>
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0 }}
                                      placeholder="New..."
                                      value={curPriceInput}
                                      onChange={(e) => setNewPrices(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                    />
                                    <button
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '4px 10px' }}
                                      onClick={() => {
                                        handleSavePrice(catDoc.category, item.name, sizeName, curPriceInput);
                                        setNewPrices(prev => ({ ...prev, [inputKey]: '' }));
                                      }}
                                    >
                                      Save
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          }

                          const inputKey = `${item.name}-regular`;
                          const curPriceInput = newPrices[inputKey] || '';

                          return (
                            <tr key={inputKey} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '10px', fontWeight: 700 }}>{item.name}</td>
                              <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{item.price}</td>
                              <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>₹</span>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0 }}
                                  placeholder="New..."
                                  value={curPriceInput}
                                  onChange={(e) => setNewPrices(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '4px 10px' }}
                                  onClick={() => {
                                    handleSavePrice(catDoc.category, item.name, null, curPriceInput);
                                    setNewPrices(prev => ({ ...prev, [inputKey]: '' }));
                                  }}
                                >
                                  Save
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    );
  }

  // 3. STAFF ACCOUNTS VIEW
  if (viewsTab === 'users') {
    const savedName = sessionStorage.getItem('sss_staff_name') || '';
    return (
      <div className="fade-in" style={{ paddingBottom: '40px' }}>

        <div className="stats-summary" style={{ marginBottom: '24px' }}>
          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              border: staffSubTab === 'active' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              transform: staffSubTab === 'active' ? 'scale(1.02)' : 'none',
              transition: 'all 0.2s ease',
              backgroundColor: staffSubTab === 'active' ? 'var(--primary-light)' : '#fff'
            }}
            onClick={() => setStaffSubTab('active')}
          >
            <p style={{ fontWeight: 'bold' }}>Active Staff 👥</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{staffUsers.length}</p>
          </div>
          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              border: staffSubTab === 'pending' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              transform: staffSubTab === 'pending' ? 'scale(1.02)' : 'none',
              transition: 'all 0.2s ease',
              backgroundColor: staffSubTab === 'pending' ? 'var(--primary-light)' : '#fff'
            }}
            onClick={() => setStaffSubTab('pending')}
          >
            <p style={{ fontWeight: 'bold' }}>Pending Requests ⏳</p>
            <p style={{
              fontSize: '24px',
              fontWeight: 900,
              color: pendingRegistrations.length > 0 ? 'var(--primary)' : 'var(--text-muted)'
            }}>{pendingRegistrations.length}</p>
          </div>
          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              border: staffSubTab === 'add_staff' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              transform: staffSubTab === 'add_staff' ? 'scale(1.02)' : 'none',
              transition: 'all 0.2s ease',
              backgroundColor: staffSubTab === 'add_staff' ? 'var(--primary-light)' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '82px'
            }}
            onClick={() => setStaffSubTab('add_staff')}
          >
            <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Add Staff</p>
          </div>
        </div>

        {staffSubTab === 'pending' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
            {pendingRegistrations.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No pending registrations.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      <th style={{ padding: '8px' }}>Username</th>
                      <th style={{ padding: '8px' }}>Requested Role</th>
                      <th style={{ padding: '8px' }}>Requested At</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRegistrations.map(req => (
                      <tr key={req._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{req.username}</td>
                        <td style={{ padding: '8px' }}>
                          <span className={`room-badge room-color-${req.role === 'admin' ? '5' : (req.role === 'cook' ? '1' : '2')}`}>
                            {req.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(req.requestedAt).toLocaleString()}</td>
                        <td style={{ padding: '8px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--veg-color)', padding: '4px 10px' }} onClick={() => handleApproveReq(req._id, req.username)}>Approve</button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px' }} onClick={() => handleRejectReq(req._id, req.username)}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {staffSubTab === 'add_staff' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
            <form onSubmit={handleDirectRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Username</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  placeholder="e.g. chef2"
                  value={directUser}
                  onChange={(e) => setDirectUser(e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Password</label>
                <input
                  type="password"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  placeholder="Enter password..."
                  value={directPass}
                  onChange={(e) => setDirectPass(e.target.value)}
                  required
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Role</label>
                <select
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={directRole}
                  onChange={(e) => setDirectRole(e.target.value)}
                  required
                >
                  <option value="waiter">Waiter</option>
                  <option value="cook">Cook</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content', marginTop: '4px' }}>Register</button>
            </form>
          </div>
        )}

        {staffSubTab === 'active' && (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                    <th style={{ padding: '8px' }}>Username</th>
                    <th style={{ padding: '8px' }}>Password (Visible to Admin)</th>
                    <th style={{ padding: '8px' }}>Account Role</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map(u => (
                    <tr key={u.username} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{u.username}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.password}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`room-badge room-color-${u.role === 'admin' ? '5' : (u.role === 'cook' ? '1' : '2')}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px' }}
                          onClick={() => handleDeleteUser(u.username)}
                        >
                          Delete Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. PRINTABLE QR SHEET GENERATOR VIEW
  if (viewsTab === 'qr') {
    return (
      <div className="fade-in" style={{ paddingBottom: '40px' }}>
        <div className="menu-filters no-print" style={{ padding: '16px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>LAN Scanning Host Configuration</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            To test scanning QR codes with mobile devices, type your computer's local Wi-Fi IP address below (e.g. <code>192.168.1.15:3000</code>). Emojis and codes will automatically update.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: '280px', margin: 0 }}
              placeholder="e.g. 192.168.1.15:3000"
              value={qrBaseOverride}
              onChange={(e) => setQrBaseOverride(e.target.value)}
            />
            <button className="btn btn-outline" onClick={() => window.print()}>Print All QR Cards 🖨️</button>
          </div>
        </div>

        <div className="qr-printable-layout">
          {rooms.map(rId => (
            <div key={rId} className="qr-card-print-block">
              {/* Local canvas for QR drawing */}
              <canvas
                ref={el => qrCanvasRefs.current[rId] = el}
                width="400"
                height="520"
                style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}
              />
              <div className="no-print" style={{ textAlign: 'center', marginTop: '10px' }}>
                <button className="btn btn-outline btn-sm" onClick={() => downloadQR(rId)}>
                  Download Card image 💾
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
