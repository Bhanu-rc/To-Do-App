import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  LogOut,
  ListChecks,
  Menu,
  Moon,
  MoreHorizontal,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';

const TASK_STORAGE = 'taskly.tasks.v1';
const THEME_STORAGE = 'taskly.theme.v1';
const PROFILE_STORAGE = 'taskly.demo-profile.v1';
const tabs = ['Tasks', 'Discover'];
const filters = ['All tasks', 'Today', 'Upcoming', 'Completed'];
const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
}).format(amount);

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(TASK_STORAGE) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE) || 'null');
  } catch {
    return null;
  }
}

function splitTaskInput(value) {
  const match = value.trim().match(/^(.*?)(?:\s+(\d+))?$/);
  const title = match?.[1]?.trim() || '';
  const requestedCount = Number(match?.[2] || 1);
  if (!title || requestedCount < 1 || requestedCount > 100) return null;
  return { title, count: requestedCount };
}

function normalizeProducts(payload) {
  const items = Array.isArray(payload) ? payload : payload?.products;
  if (!Array.isArray(items)) throw new Error('The API response did not contain a product list.');
  const normalizedItems = items
    .filter((product) => product && typeof product.title === 'string')
    .map((product) => ({
      ...product,
      image: product.image || product.thumbnail || '',
      category: product.category || 'Uncategorized',
      description: product.description || '',
      price: Number(product.price) || 0,
      rating: typeof product.rating === 'number'
        ? { rate: product.rating, count: Number(product.stock) || 0 }
        : { rate: Number(product.rating?.rate) || 0, count: Number(product.rating?.count) || 0 },
    }));
  if (!normalizedItems.length) throw new Error('The product API returned no usable products.');
  return normalizedItems;
}

function App() {
  const [tasks, setTasks] = useState(readTasks);
  const [view, setView] = useState('Tasks');
  const [filter, setFilter] = useState('All tasks');
  const [taskText, setTaskText] = useState('');
  const [taskDate, setTaskDate] = useState(today);
  const [taskSearch, setTaskSearch] = useState('');
  const [menuFor, setMenuFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState(today);
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_STORAGE) === 'dark');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateDate, setExchangeRateDate] = useState('');
  const [exchangeRateError, setExchangeRateError] = useState('');
  const [exchangeRateLoading, setExchangeRateLoading] = useState(true);
  const [exchangeRateRequest, setExchangeRateRequest] = useState(0);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sort, setSort] = useState('featured');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState(readProfile);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    localStorage.setItem(TASK_STORAGE, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE, dark ? 'dark' : 'light');
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    setExchangeRateLoading(true);
    setExchangeRateError('');

    fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Exchange-rate API returned ${response.status}.`);
        return response.json();
      })
      .then((payload) => {
        const rate = Number(payload?.rates?.INR);
        if (!Number.isFinite(rate) || rate <= 0 || typeof payload?.date !== 'string') {
          throw new Error('The exchange-rate API returned an invalid USD/INR rate.');
        }
        setExchangeRate(rate);
        setExchangeRateDate(payload.date);
      })
      .catch((error) => {
        if (!controller.signal.aborted || timedOut) {
          setExchangeRateError(timedOut
            ? 'The exchange-rate request timed out.'
            : error.message || 'Unable to load the USD/INR exchange rate.');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted || timedOut) setExchangeRateLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [exchangeRateRequest]);

  useEffect(() => {
    const controller = new AbortController();
    const loadProducts = (url) => {
      const requestController = new AbortController();
      const timeoutId = setTimeout(() => requestController.abort(), 5000);
      const abortRequest = () => requestController.abort();
      controller.signal.addEventListener('abort', abortRequest, { once: true });
      return fetch(url, { signal: requestController.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Product API returned ${response.status}.`);
          return response.json();
        })
        .finally(() => {
          clearTimeout(timeoutId);
          controller.signal.removeEventListener('abort', abortRequest);
        });
    };
    loadProducts('https://fakestoreapi.com/products')
      .then(normalizeProducts)
      .catch((error) => {
        if (controller.signal.aborted) throw error;
        return loadProducts('https://dummyjson.com/products').then(normalizeProducts);
      })
      .then(setProducts)
      .catch((error) => {
        if (error.name !== 'AbortError') setProductError(error.message || 'Unable to reach the store.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || task.title.toLowerCase().includes(query);
      const matchesFilter = filter === 'All tasks'
        || (filter === 'Today' && task.date === today() && !task.completed)
        || (filter === 'Upcoming' && task.date > today() && !task.completed)
        || (filter === 'Completed' && task.completed);
      return matchesSearch && matchesFilter;
    });
  }, [tasks, filter, taskSearch]);

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery = !query || `${product.title} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return matchesQuery && (category === 'All' || product.category === category);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      if (sort === 'rating') return b.rating.rate - a.rating.rate;
      return a.id - b.id;
    });
  }, [products, productSearch, category, sort]);

  const addTasks = (event) => {
    event.preventDefault();
    const parsed = splitTaskInput(taskText);
    if (!parsed) return;
    const batch = Array.from({ length: parsed.count }, (_, index) => ({
      id: makeId(),
      title: parsed.title,
      date: taskDate,
      completed: false,
      updates: 0,
      createdAt: Date.now() + index,
    }));
    setTasks((current) => [...batch, ...current]);
    setTaskText('');
  };

  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  const deleteTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    setMenuFor(null);
    setEditing((current) => current === id ? null : current);
  };

  const startEditing = (task) => {
    setEditing(task.id);
    setEditText(task.title);
    setEditDate(task.date);
    setMenuFor(null);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    const title = editText.trim();
    if (!title) return;
    setTasks((current) => current.map((task) => task.id === editing
      ? { ...task, title, date: editDate, updates: task.updates + 1 }
      : task));
    setEditing(null);
  };

  const submitAuth = (event) => {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (authMode === 'signup' && authPassword.length < 8) {
      setAuthError('Use at least 8 characters for your password.');
      return;
    }
    if (authMode === 'signup' && authPassword !== authConfirm) {
      setAuthError('Those passwords do not match.');
      return;
    }
    const nextProfile = { name: authName.trim() || email.split('@')[0], email };
    localStorage.setItem(PROFILE_STORAGE, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setAuthError('');
  };

  const signOut = () => {
    localStorage.removeItem(PROFILE_STORAGE);
    setProfile(null);
    setAuthMode('login');
    setAuthPassword('');
    setAuthConfirm('');
  };

  const taskCount = tasks.filter((task) => !task.completed).length;
  const greeting = new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date()).includes('AM') ? 'Good morning' : 'Good afternoon';

  if (!profile) {
    return (
      <div className="auth-shell">
        <aside className="auth-story">
          <a className="brand auth-brand" href="#home" aria-label="Taskly home">
            <span className="brand-mark"><Check size={18} strokeWidth={3} /></span>
            <span>taskly<span className="brand-period">.</span></span>
          </a>
          <div className="auth-story-copy">
            <h1>Make room for what matters.</h1>
            <p>Your plans, small wins, and next good idea, all in one place.</p>
          </div>
          <div className="auth-story-mark" aria-hidden="true"><span>t.</span><i /><i /><i /></div>
          <span className="auth-story-foot">TASKLY / YOUR DAY, WELL SPENT</span>
        </aside>
        <main className="auth-main">
          <button className="icon-button auth-theme" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark((value) => !value)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <form className="auth-form" onSubmit={submitAuth}>
            <p className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'A FRESH START'}</p>
            <h2>{authMode === 'login' ? 'Sign in to Taskly' : 'Create your account'}</h2>
            <p className="auth-subtitle">{authMode === 'login' ? 'Pick up right where you left off.' : 'A little space for the things you want to do.'}</p>
            {authMode === 'signup' && <label className="auth-field">Your name<input autoComplete="name" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Alex Morgan" required /></label>}
            <label className="auth-field">Email address<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label className="auth-field">Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Enter your password'} minLength={authMode === 'signup' ? 8 : undefined} required /></label>
            {authMode === 'signup' && <label className="auth-field">Confirm password<input type="password" autoComplete="new-password" value={authConfirm} onChange={(event) => setAuthConfirm(event.target.value)} placeholder="Enter your password again" required /></label>}
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            <button className="primary-button auth-submit" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
            <p className="auth-switch">{authMode === 'login' ? 'New to Taskly?' : 'Already have an account?'} <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
            <p className="demo-note">Demo sign-in only. Any valid email and password will continue. Passwords are not saved; this does not provide secure, real accounts.</p>
          </form>
          <span className="auth-copyright">© TASKLY · MAKE ROOM FOR WHAT MATTERS</span>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setView('Tasks'); }} aria-label="Taskly home">
          <span className="brand-mark"><Check size={18} strokeWidth={3} /></span>
          <span>taskly<span className="brand-period">.</span></span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {tabs.map((tab) => <button key={tab} className={`nav-tab ${view === tab ? 'active' : ''}`} onClick={() => { setView(tab); setMobileMenuOpen(false); }}>{tab === 'Tasks' ? <ListChecks size={16} /> : <ShoppingBag size={16} />}{tab}</button>)}
        </nav>
        <div className="topbar-actions">
          <span className="today-label">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
          <button className="icon-button theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark((value) => !value)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <span className="avatar" aria-label="Your profile">A</span>
                  <button className="profile-button" onClick={signOut} aria-label={`Sign out ${profile.name}`} title={`Sign out ${profile.name}`}><span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><LogOut size={14} /></button>
        </div>
      </header>

      <main className="main-content">
        {view === 'Tasks' ? (
          <>
            <section className="welcome-row">
              <div>
                <p className="eyebrow"><Sparkles size={14} /> YOUR SPACE, YOUR PACE</p>
                <h1>{greeting}, {profile.name} <span className="wave">✳</span></h1>
                <p className="welcome-copy">A little progress goes a long way.</p>
              </div>
              <div className="focus-note"><span className="focus-icon"><CheckCheck size={18} /></span><span><strong>{taskCount} to go</strong><small>Keep your momentum</small></span></div>
            </section>

            <form className="task-composer" onSubmit={addTasks}>
              <span className="composer-plus"><Plus size={19} /></span>
              <input aria-label="New task" placeholder="What needs your attention? Add a number to repeat it, e.g. Make Food 3" value={taskText} onChange={(event) => setTaskText(event.target.value)} />
              <label className="date-picker" aria-label="Task date"><input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></label>
              <button className="primary-button" type="submit"><Plus size={16} /><span>Add task</span></button>
            </form>

            <section className="tasks-section" aria-label="Task list">
              <div className="section-toolbar">
                <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
                  {filters.map((item) => <button role="tab" aria-selected={filter === item} key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}<span className="filter-count">{item === 'All tasks' ? tasks.length : tasks.filter((task) => item === 'Today' ? task.date === today() && !task.completed : item === 'Upcoming' ? task.date > today() && !task.completed : task.completed).length}</span></button>)}
                </div>
                <label className="inline-search"><Search size={16} /><input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Find a task" aria-label="Search tasks" /></label>
              </div>

              <div className="task-list">
                {visibleTasks.length ? visibleTasks.map((task) => (
                  <article className={`task-row ${task.completed ? 'completed' : ''} ${menuFor === task.id ? 'menu-open' : ''}`} key={task.id}>
                    <button className={`task-check ${task.completed ? 'checked' : ''}`} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} onClick={() => toggleTask(task.id)}>{task.completed && <Check size={14} strokeWidth={3} />}</button>
                    {editing === task.id ? (
                      <form className="edit-form" onSubmit={saveEdit}>
                        <input autoFocus aria-label="Edit task title" value={editText} onChange={(event) => setEditText(event.target.value)} />
                        <input type="date" aria-label="Edit task date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
                        <button className="icon-button save-edit" aria-label="Save task changes"><Check size={17} /></button>
                        <button type="button" className="icon-button" aria-label="Cancel editing" onClick={() => setEditing(null)}><X size={17} /></button>
                      </form>
                    ) : (
                      <>
                        <div className="task-main"><span className="task-title">{task.title}</span><span className="update-count">{task.updates} {task.updates === 1 ? 'update' : 'updates'}</span></div>
                        <span className={`task-date ${task.date === today() ? 'is-today' : ''}`}>{task.date === today() ? 'Today' : task.date > today() ? new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${task.date}T12:00:00`)) : 'Overdue'}</span>
                        <div className="task-menu-wrap">
                          <button type="button" className="icon-button more-button" aria-label={`More options for ${task.title}`} aria-expanded={menuFor === task.id} onClick={() => setMenuFor(menuFor === task.id ? null : task.id)}><MoreHorizontal size={20} /></button>
                          {menuFor === task.id && <div className="task-menu"><button type="button" onClick={() => startEditing(task)}>Edit task</button><button type="button" className="danger-action" onClick={() => deleteTask(task.id)}><Trash2 size={14} /> Delete</button></div>}
                        </div>
                      </>
                    )}
                  </article>
                )) : <div className="empty-state"><span className="empty-icon"><ListChecks size={22} /></span><strong>{taskSearch ? 'No matching tasks' : 'Nothing on this list yet'}</strong><p>{taskSearch ? 'Try another search.' : 'Add a task above and give yourself a clear next step.'}</p></div>}
              </div>
              <p className="list-footnote"><CircleHelp size={13} /> Each edit is counted so you can see how a task evolves.</p>
            </section>

            <section className="store-teaser">
              <div><p className="eyebrow"><ShoppingBag size={14} /> A CHANGE OF PACE</p><h2>Take a look around.</h2><p>Everyday finds from the Fake Store catalog.</p></div>
              <button className="text-button" onClick={() => setView('Discover')}>Explore products <ArrowRight size={16} /></button>
              <div className="teaser-art" aria-hidden="true"><span>objects<br />for living</span><PackageOpen size={58} strokeWidth={1.1} /></div>
            </section>
          </>
        ) : (
          <section className="discover-page">
            <div className="discover-heading"><div><p className="eyebrow"><Sparkles size={14} /> THE GOOD FINDS DEPARTMENT</p><h1>Browse a little.</h1><p className="welcome-copy">A considered collection of things worth a closer look.</p></div><span className="catalog-count">{products.length} ITEMS <span>·</span> FAKE STORE API</span></div>
            <div className="catalog-tools">
              <label className="catalog-search"><Search size={17} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search the collection" aria-label="Search products" /><kbd>⌘ K</kbd></label>
              <label className="sort-select"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option></select><ChevronDown size={14} /></label>
            </div>
            <p className={`exchange-rate-status ${exchangeRateError ? 'has-error' : ''}`} role={exchangeRateError ? 'alert' : 'status'}>
              {exchangeRateLoading
                ? 'Loading the latest USD to INR rate...'
                : exchangeRateError
                  ? <>Could not load the USD to INR rate: {exchangeRateError} <button type="button" onClick={() => setExchangeRateRequest((request) => request + 1)}>Retry</button></>
                  : `Latest reference rate: $1 = ${formatINR(exchangeRate)} (as of ${exchangeRateDate})`}
            </p>
            <div className="category-list" aria-label="Product categories">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'active' : ''}>{item}</button>)}</div>
            {productsLoading ? <div className="products-state"><span className="loader" /><strong>Finding the good stuff...</strong></div> : productError ? <div className="products-state error-state"><PackageOpen size={30} /><strong>Couldn’t load the collection</strong><p>{productError}</p><button className="secondary-button" onClick={() => window.location.reload()}>Try again</button></div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product, index) => <button className="product-card" key={product.id} onClick={() => setSelectedProduct(product)} style={{ '--item-index': index }}><span className="product-image-wrap"><img src={product.image} alt={product.title} loading="lazy" /><span className="quick-view">Quick view <ArrowRight size={13} /></span></span><span className="product-meta"><span className="product-category">{product.category}</span><span className="product-rating">★ {product.rating.rate}</span></span><span className="product-title">{product.title}</span><span className="product-price">{exchangeRate === null ? 'INR price unavailable' : formatINR(product.price * exchangeRate)}</span></button>)}</div> : <div className="products-state"><PackageOpen size={30} /><strong>No products found</strong><p>Try another search or category.</p></div>}
          </section>
        )}
      </main>

      {selectedProduct && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}><section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title"><button className="icon-button modal-close" aria-label="Close product details" onClick={() => setSelectedProduct(null)}><X size={20} /></button><div className="modal-image"><img src={selectedProduct.image} alt={selectedProduct.title} /></div><div className="modal-info"><button className="back-link" onClick={() => setSelectedProduct(null)}><ArrowLeft size={15} /> Back to collection</button><p className="product-category">{selectedProduct.category}</p><h2 id="product-detail-title">{selectedProduct.title}</h2><p className="detail-rating"><span>★ {selectedProduct.rating.rate}</span> <span>{selectedProduct.rating.count} reviews</span></p><p className="detail-description">{selectedProduct.description}</p><div className="modal-buy-row"><strong>{exchangeRate === null ? 'INR price unavailable' : formatINR(selectedProduct.price * exchangeRate)}</strong><button className="primary-button" onClick={() => setSelectedProduct(null)}><ShoppingBag size={16} /> Done browsing</button></div></div></section></div>}

      <footer className="site-footer"><span>taskly<span className="brand-period">.</span></span><span>Make room for what matters.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <ArrowRight size={13} /></button></footer>
    </div>
  );
}

export default App;
