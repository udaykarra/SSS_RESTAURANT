import React, { useState, useEffect } from 'react';

export default function CustomerView({ roomId, menu, activeTab, onOrderSubmit, onStaffPortalClick }) {
  const isRoomValid = roomId && ['1', '2', '3', '4', '5', '6', 'takeaway'].includes(roomId);

  // States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [vegFilter, setVegFilter] = useState('veg'); // 'veg' | 'non-veg'
  const [cart, setCart] = useState([]); // Array of { name, veg, category, price, size, qty, notes, lineId }
  const [itemSizes, setItemSizes] = useState({}); // key: itemName, value: sizeSelected
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotes, setCartNotes] = useState('');

  // Order status page states
  const [placedOrder, setPlacedOrder] = useState(null);

  // Setup default category when menu loads
  useEffect(() => {
    if (menu && menu.length > 0) {
      setSelectedCategory(menu[0].category);
    }
  }, [menu]);

  // Adjust veg filters dynamically for special categories
  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName);
    if (catName === 'Roti & Breads' || catName === 'Beverages') {
      setVegFilter('all');
    } else if (vegFilter === 'all') {
      setVegFilter('veg');
    }
  };

  const isReadOnly = !isRoomValid;

  // Helper: Retrieve active price
  const getItemPrice = (item) => {
    if (item.sizes) {
      const selectedSize = itemSizes[item.name] || Object.keys(item.sizes)[0];
      return item.sizes[selectedSize] || 0;
    }
    return item.price || 0;
  };

  // Add to Cart
  const handleAddToCart = (item) => {
    const selectedSize = item.sizes ? (itemSizes[item.name] || Object.keys(item.sizes)[0]) : null;
    const price = getItemPrice(item);

    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.name === item.name && i.size === selectedSize);
      if (existingIdx !== -1) {
        return prev.map((i, idx) => idx === existingIdx ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        lineId: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        veg: item.veg,
        category: selectedCategory,
        price,
        size: selectedSize,
        qty: 1,
        notes: ''
      }];
    });
  };

  const updateCartQty = (lineId, offset) => {
    setCart(prev =>
      prev.map(i => i.lineId === lineId ? { ...i, qty: Math.max(0, i.qty + offset) } : i)
        .filter(i => i.qty > 0)
    );
  };

  // Submit Guest Order
  const handleSubmitOrder = () => {
    if (cart.length === 0) return;

    // Estimate prep time
    // Base 15m + 5m per active running tab
    const estimatedMinutes = 15;

    // Compile items
    const formattedItems = cart.map(i => ({
      lineId: i.lineId,
      name: i.name,
      veg: i.veg,
      category: i.category,
      price: i.price,
      qty: i.qty,
      size: i.size || '',
      notes: cartNotes.trim() || '',
      source: 'customer',
      done: false
    }));

    onOrderSubmit(formattedItems);
    setPlacedOrder({
      items: formattedItems,
      estimatedMinutes,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setCart([]);
    setCartNotes('');
    setIsCartOpen(false);
  };

  // Render Order Tracker view if they just placed an order
  if (placedOrder) {
    const totalAmount = placedOrder.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    return (
      <div className="container fade-in" style={{ paddingBottom: '40px' }}>
        <header className="header">
          <div className="header-content">
            <h1 style={{ fontSize: '18px' }}>SSS Order Tracker</h1>
            <span className="room-badge room-color-1">Table {roomId === 'takeaway' ? 'Takeaway' : roomId}</span>
          </div>
        </header>

        <div className="card" style={{ marginTop: '24px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍🍳</div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '22px', marginBottom: '8px' }}>Order Sent to Kitchen</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            We are preparing your fresh hot food items.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
            <div className="stat-card" style={{ flex: 'none', minWidth: '120px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Prep</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{placedOrder.estimatedMinutes} mins</p>
            </div>
            <div className="stat-card" style={{ flex: 'none', minWidth: '120px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ordered At</p>
              <p style={{ fontSize: '20px', fontWeight: 800 }}>{placedOrder.timestamp}</p>
            </div>
          </div>

          <div style={{ textAlign: 'left', borderTop: '2px dashed var(--border-color)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Your Ticket Details:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {placedOrder.items.map(item => (
                <div key={item.lineId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{item.qty}x {item.name} {item.size && `(${item.size})`}</span>
                  <strong>₹{item.price * item.qty}</strong>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', marginTop: '12px', paddingTop: '12px', fontWeight: 'bold' }}>
              <span>Total Bill Amount:</span>
              <span style={{ color: 'var(--primary)' }}>₹{totalAmount}</span>
            </div>
          </div>

          <button className="btn btn-outline" style={{ marginTop: '24px', width: '100%' }} onClick={() => setPlacedOrder(null)}>
            Order More Items
          </button>
        </div>
      </div>
    );
  }

  // Active Menu Category details
  const activeCategoryDoc = menu.find(c => c.category === selectedCategory);
  const itemsList = activeCategoryDoc ? activeCategoryDoc.items : [];

  // Filtered menu items
  const filteredItems = itemsList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (vegFilter === 'veg') return matchesSearch && item.veg;
    if (vegFilter === 'non-veg') return matchesSearch && !item.veg;
    return matchesSearch;
  });

  const cartTotalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotalVal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  return (
    <div style={{ paddingBottom: cartTotalQty > 0 ? '90px' : '40px' }}>
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            <h1>SSS Family Restaurant</h1>
            <p>{isReadOnly ? 'Beside Reliance Smart, Ranastalam' : `Table ${roomId === 'takeaway' ? 'Table ' : ''}${roomId}`}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onStaffPortalClick}>Login</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="container">
        {isReadOnly && (
          <div className="card text-center fade-in no-print" style={{ margin: '0 auto 20px', padding: '20px', maxWidth: '600px', backgroundColor: '#fdf2e9', borderColor: '#fad7b7', color: '#7d3c00' }}>
            <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '16px', marginBottom: '6px' }}>🍽️ Welcome to our Digital Menu Catalog</h3>
            <p style={{ fontSize: '12px', lineHeight: '1.4' }}>To place an order from your table, please scan the QR code located on your table or ask a waiter to add it for you.</p>
            <p style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <span>📞 Phone: 9985177939</span>
            </p>
          </div>
        )}
        {/* Search menu */}
        <div className="menu-filters">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Veg filters (HIDDEN on Breads and Beverages) */}
          {selectedCategory !== 'Roti & Breads' && selectedCategory !== 'Beverages' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className={`btn btn-sm ${vegFilter === 'veg' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  backgroundColor: vegFilter === 'veg' ? 'var(--veg-color)' : '',
                  borderColor: vegFilter === 'veg' ? 'var(--veg-color)' : '',
                  color: vegFilter === 'veg' ? '#fff' : ''
                }}
                onClick={() => setVegFilter('veg')}
              >
                🟢 Pure Veg
              </button>
              <button
                className={`btn btn-sm ${vegFilter === 'non-veg' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  backgroundColor: vegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
                  borderColor: vegFilter === 'non-veg' ? 'var(--nonveg-color)' : '',
                  color: vegFilter === 'non-veg' ? '#fff' : ''
                }}
                onClick={() => setVegFilter('non-veg')}
              >
                🔴 Non-Veg
              </button>
            </div>
          )}
        </div>

        {/* Categories Scroll bar */}
        <div className="category-scroll">
          <div className="category-scroll-inner">
            {menu.map(cat => (
              <span
                key={cat.category}
                className={`chip ${selectedCategory === cat.category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat.category)}
              >
                {cat.category}
              </span>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="menu-sections fade-in" style={{ marginTop: '20px' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '16px' }}>
            {selectedCategory}
          </h2>

          {filteredItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
              No matches found. Try searching something else.
            </p>
          ) : (
            (() => {
              const isRotiOrBeverage = selectedCategory === 'Roti & Breads' || selectedCategory === 'Beverages';

              const renderCard = (item) => {
                const sizesList = item.sizes ? Object.keys(item.sizes) : [];
                const activeSize = itemSizes[item.name] || (sizesList.length > 0 ? sizesList[0] : null);
                const activePrice = getItemPrice(item);

                return (
                  <div key={item.name} className="menu-item-card">
                    <div className="menu-item-header">
                      <h3>
                        {!isRotiOrBeverage && (
                          <div className={`veg-badge ${item.veg ? '' : 'non-veg'}`}>
                            <span className={item.veg ? 'dot' : 'triangle'}></span>
                          </div>
                        )}
                        {item.name}
                      </h3>
                      <span className="price-tag">₹{activePrice}</span>
                    </div>

                    {sizesList.length > 0 && (
                      <div className="size-selector">
                        {sizesList.map(sz => (
                          <button
                            key={sz}
                            className={`size-btn ${activeSize === sz ? 'active' : ''}`}
                            onClick={() => setItemSizes(prev => ({ ...prev, [item.name]: sz }))}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isReadOnly && (
                      <div className="menu-item-footer">
                        <button className="btn btn-primary btn-sm" onClick={() => handleAddToCart(item)}>
                          Add to Order +
                        </button>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="menu-grid">
                  {filteredItems.map(renderCard)}
                </div>
              );
            })()
          )}
        </div>
      </main>

      {/* Guest Cart Sticky Bar Footer */}
      {cartTotalQty > 0 && !isReadOnly && (
        <div className="cart-bar fade-in no-print">
          <div className="cart-bar-content" onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer' }}>
            <div className="cart-bar-info">
              <p>{cartTotalQty} Item{cartTotalQty > 1 ? 's' : ''} in cart</p>
              <p><span>₹{cartTotalVal}</span></p>
            </div>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setIsCartOpen(true); }}>
              View Cart 🛒
            </button>
          </div>
        </div>
      )}

      {/* Cart Sheet Drawer Modal */}
      {isCartOpen && (
        <div className="receipt-modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="receipt-modal-container card fade-in" style={{ width: '90%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '18px' }}>Your Order Review</h2>
              <button className="btn btn-outline btn-sm" style={{ padding: '2px 8px' }} onClick={() => setIsCartOpen(false)}>Close</button>
            </div>

            <div className="cart-items-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.lineId} className="cart-line">
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700 }}>
                      {item.name} {item.size && `(${item.size})`}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>₹{item.price * item.qty}</span>
                  </div>
                  <div className="stepper">
                    <button className="stepper-btn" onClick={() => updateCartQty(item.lineId, -1)}>-</button>
                    <span className="stepper-val">{item.qty}</span>
                    <button className="stepper-btn" onClick={() => updateCartQty(item.lineId, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Special Requests / Notes</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="e.g. less spicy, extra spoons..."
                value={cartNotes}
                onChange={(e) => setCartNotes(e.target.value)}
                style={{ fontSize: '12px', resize: 'none' }}
              />
            </div>

            <div style={{ borderTop: '2px dashed var(--border-color)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Subtotal Amount:</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary)' }}>₹{cartTotalVal}</span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleSubmitOrder}
            >
              Place Cooking Order 👨‍🍳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
