import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api, readSession, saveSession } from './api';

const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
const coin = (symbol = '') => symbol.replace('USDT', '');
const money = (value, digits = 2) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(Number(value || 0));
const number = (value, digits = 4) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits });

function Mark() {
  return <span className="mark"><i /><i /><i /></span>;
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      saveSession(data); onAuth(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <main className="auth-shell">
    <section className="auth-story">
      <a className="brand" href="#"><Mark /> PAPERTRADE</a>
      <div>
        <span className="eyebrow">THE MARKET. ZERO RISK.</span>
        <h1>Build your edge<br />before you <em>bet it.</em></h1>
        <p>Practice with live crypto prices, sharpen your instincts, and turn market curiosity into a repeatable strategy.</p>
        <div className="feature-row"><span>LIVE DATA</span><span>REAL STRATEGIES</span><span>VIRTUAL CAPITAL</span></div>
      </div>
      <small>SIMULATED TRADING · REAL MARKET DATA</small>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">WELCOME {mode === 'login' ? 'BACK' : 'IN'}</span>
        <h2>{mode === 'login' ? 'Ready to trade?' : 'Start your run.'}</h2>
        <p>{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create your account with $10,000 virtual cash.'}</p>
        <label>Email address<input type="email" required placeholder="trader@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'CONNECTING…' : mode === 'login' ? 'ENTER THE DESK →' : 'CREATE ACCOUNT →'}</button>
        <div className="switch">{mode === 'login' ? 'New to Papertrade?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div>
      </form>
    </section>
  </main>;
}

function Sparkline({ positive = true }) {
  return <svg className={positive ? 'spark positive' : 'spark negative'} viewBox="0 0 120 36" preserveAspectRatio="none"><path d={positive ? 'M1 30 C14 29,18 18,28 22 S43 32,54 20 S72 23,82 11 S101 18,119 4' : 'M1 8 C12 15,20 7,30 14 S45 10,56 22 S72 17,83 26 S103 19,119 32'} /></svg>;
}

function Dashboard({ session, onLogout }) {
  const [tab, setTab] = useState('Overview');
  const [portfolio, setPortfolio] = useState(null);
  const [prices, setPrices] = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [selected, setSelected] = useState('BTCUSDT');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState('0.01');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      api('/api/portfolio'), api('/api/prices'), api('/api/watchlist'),
      api('/api/trade/history?limit=20'), api('/api/leaderboard?limit=10'),
    ]);
    if (results[0].status === 'fulfilled') setPortfolio(results[0].value);
    if (results[1].status === 'fulfilled') setPrices(results[1].value || {});
    if (results[2].status === 'fulfilled') setWatchlist(results[2].value || []);
    if (results[3].status === 'fulfilled') setHistory(results[3].value?.trades || []);
    if (results[4].status === 'fulfilled') setLeaders(results[4].value || []);
  }, []);

  useEffect(() => { load(); const timer = setInterval(load, 20000); return () => clearInterval(timer); }, [load]);
  useEffect(() => {
    const socket = io(API_URL, { auth: { token: readSession()?.accessToken } });
    symbols.forEach((symbol) => socket.emit('subscribe:symbol', symbol));
    socket.on('price:update', ({ symbol, price }) => setPrices((p) => ({ ...p, [symbol]: price })));
    socket.on('portfolio:update', load); socket.on('trade:confirmation', load);
    return () => socket.disconnect();
  }, [load]);

  const price = Number(prices[selected] ?? watchlist.find((x) => x.symbol === selected)?.currentPrice ?? 0);
  const holding = portfolio?.holdings?.find((x) => x.symbol === selected);
  const favorites = useMemo(() => new Set(watchlist.map((x) => x.symbol)), [watchlist]);
  const pnlPositive = Number(portfolio?.totalPnl) >= 0;

  const trade = async () => {
    setBusy(true); setNotice('');
    try {
      await api(`/api/trade/${side}`, { method: 'POST', body: JSON.stringify({ symbol: selected, quantity }) });
      setNotice(`${side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${coin(selected)}`); await load();
    } catch (err) { setNotice(err.message); } finally { setBusy(false); }
  };

  const toggleWatch = async (symbol) => {
    try {
      await api(`/api/watchlist/${symbol}`, { method: favorites.has(symbol) ? 'DELETE' : 'POST' }); await load();
    } catch (err) { setNotice(err.message); }
  };

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: readSession()?.refreshToken }) }); } catch { /* clear locally */ }
    saveSession(null); onLogout();
  };

  const marketRows = symbols.map((symbol, index) => ({ symbol, price: prices[symbol], change: [2.84, -1.16, 0.72, 4.21, -0.38, 1.94][index] }));

  return <div className="app-shell">
    <header><a className="brand" href="#"><Mark /> PAPERTRADE</a><nav>{['Overview', 'Markets', 'Portfolio', 'Activity'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav><div className="user"><span><b>{session.user.email.split('@')[0]}</b><small>{session.user.role}</small></span><button title="Log out" onClick={logout}>↗</button></div></header>
    <main className="dashboard">
      <section className="welcome"><div><span className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h1>{tab === 'Overview' ? 'Good to see you.' : tab}</h1><p>{tab === 'Overview' ? 'Here’s how your portfolio is moving today.' : 'Your market, your decisions, your pace.'}</p></div><div className="live"><i /> LIVE MARKET</div></section>

      {tab === 'Overview' && <>
        <section className="metrics">
          <article className="hero-metric"><span>PORTFOLIO VALUE</span><h2>{money(portfolio?.portfolioValue)}</h2><div className={pnlPositive ? 'gain' : 'loss'}>{pnlPositive ? '↗' : '↘'} {money(Math.abs(Number(portfolio?.totalPnl)))} · {portfolio?.totalPnlPercent || '0.00'}%</div><Sparkline positive={pnlPositive} /></article>
          <article><span>AVAILABLE CASH</span><h3>{money(portfolio?.cashBalance)}</h3><p>Ready to deploy</p></article>
          <article><span>INVESTED</span><h3>{money(portfolio?.holdingsValue)}</h3><p>{portfolio?.holdings?.length || 0} open positions</p></article>
        </section>
        <section className="grid-main">
          <div className="panel market-panel"><div className="panel-title"><div><span className="eyebrow">MARKET PULSE</span><h2>Watchlist</h2></div><button onClick={() => setTab('Markets')}>VIEW MARKET →</button></div><div className="table-head"><span>ASSET</span><span>PRICE</span><span>24H</span><span>TREND</span></div>{marketRows.slice(0, 4).map((row) => <button className="market-row" onClick={() => setSelected(row.symbol)} key={row.symbol}><span className={`coin c-${coin(row.symbol).toLowerCase()}`}>{coin(row.symbol).slice(0, 1)}</span><span><b>{coin(row.symbol)}</b><small>{row.symbol}</small></span><strong>{row.price ? money(row.price, row.price < 1 ? 4 : 2) : '—'}</strong><em className={row.change >= 0 ? 'gain' : 'loss'}>{row.change >= 0 ? '+' : ''}{row.change}%</em><Sparkline positive={row.change >= 0} /></button>)}</div>
          <TradeTicket selected={selected} setSelected={setSelected} side={side} setSide={setSide} quantity={quantity} setQuantity={setQuantity} price={price} holding={holding} cash={portfolio?.cashBalance} onTrade={trade} busy={busy} notice={notice} />
        </section>
      </>}

      {tab === 'Markets' && <section className="panel full-panel"><div className="panel-title"><div><span className="eyebrow">REAL-TIME PRICES</span><h2>Markets</h2></div></div><div className="table-head market-wide"><span>ASSET</span><span>PRICE</span><span>24H</span><span>TREND</span><span>WATCH</span></div>{marketRows.map((row) => <div className="market-row market-wide" key={row.symbol}><span className={`coin c-${coin(row.symbol).toLowerCase()}`}>{coin(row.symbol)[0]}</span><span><b>{coin(row.symbol)}</b><small>{row.symbol}</small></span><strong>{row.price ? money(row.price, row.price < 1 ? 4 : 2) : 'Waiting…'}</strong><em className={row.change >= 0 ? 'gain' : 'loss'}>{row.change > 0 ? '+' : ''}{row.change}%</em><Sparkline positive={row.change >= 0} /><button className={favorites.has(row.symbol) ? 'star active' : 'star'} onClick={() => toggleWatch(row.symbol)}>★</button><button className="trade-link" onClick={() => { setSelected(row.symbol); setTab('Overview'); }}>TRADE →</button></div>)}</section>}

      {tab === 'Portfolio' && <section className="panel full-panel"><div className="panel-title"><div><span className="eyebrow">YOUR POSITIONS</span><h2>Holdings</h2></div><b>{money(portfolio?.holdingsValue)}</b></div><div className="hold-head"><span>ASSET</span><span>QUANTITY</span><span>AVG. COST</span><span>MARKET VALUE</span><span>RETURN</span></div>{portfolio?.holdings?.length ? portfolio.holdings.map((item) => <div className="holding-row" key={item.symbol}><span><i className={`coin c-${coin(item.symbol).toLowerCase()}`}>{coin(item.symbol)[0]}</i><b>{coin(item.symbol)}</b></span><span>{number(item.quantity, 8)}</span><span>{money(item.avgBuyPrice)}</span><span>{money(item.marketValue)}</span><em className={Number(item.unrealizedPnl) >= 0 ? 'gain' : 'loss'}>{money(item.unrealizedPnl)}<small>{item.unrealizedPnlPercent}%</small></em></div>) : <Empty text="No open positions yet. Your first trade will appear here." />}</section>}

      {tab === 'Activity' && <section className="activity-grid"><div className="panel"><div className="panel-title"><div><span className="eyebrow">ORDER LOG</span><h2>Recent trades</h2></div></div>{history.length ? history.map((item) => <div className="activity-row" key={item.id}><i className={item.tradeType === 'BUY' ? 'buy-dot' : 'sell-dot'}>{item.tradeType === 'BUY' ? '↓' : '↑'}</i><span><b>{item.tradeType} {coin(item.symbol)}</b><small>{new Date(item.executedAt).toLocaleString()}</small></span><span><b>{number(item.quantity, 8)}</b><small>{money(item.totalValue)}</small></span></div>) : <Empty text="No trades recorded yet." />}</div><div className="panel leaderboard"><div className="panel-title"><div><span className="eyebrow">TOP TRADERS</span><h2>Leaderboard</h2></div></div>{leaders.map((item) => <div className="leader-row" key={item.userId}><strong>{String(item.rank).padStart(2, '0')}</strong><span><b>{item.email.split('@')[0]}</b><small>{money(item.portfolioValue)}</small></span><em className={Number(item.pnl) >= 0 ? 'gain' : 'loss'}>{Number(item.pnlPercent) >= 0 ? '+' : ''}{item.pnlPercent}%</em></div>)}</div></section>}
    </main>
  </div>;
}

function TradeTicket({ selected, setSelected, side, setSide, quantity, setQuantity, price, holding, cash, onTrade, busy, notice }) {
  return <aside className="panel ticket"><div><span className="eyebrow">QUICK ORDER</span><h2>Trade</h2></div><div className="segmented"><button className={side === 'buy' ? 'active' : ''} onClick={() => setSide('buy')}>BUY</button><button className={side === 'sell' ? 'active sell' : ''} onClick={() => setSide('sell')}>SELL</button></div><label>Asset<select value={selected} onChange={(e) => setSelected(e.target.value)}>{symbols.map((s) => <option key={s}>{s}</option>)}</select></label><div className="quote"><span>LIVE PRICE</span><b>{price ? money(price, price < 1 ? 4 : 2) : 'Waiting…'}</b></div><label>Quantity<div className="input-unit"><input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /><span>{coin(selected)}</span></div></label><div className="order-total"><span>ESTIMATED TOTAL</span><b>{money(price * Number(quantity || 0))}</b></div><button className={`primary ${side === 'sell' ? 'danger' : ''}`} disabled={busy || !price || Number(quantity) <= 0} onClick={onTrade}>{busy ? 'PLACING ORDER…' : `${side.toUpperCase()} ${coin(selected)} →`}</button><small className="balance">{side === 'buy' ? `Available ${money(cash)}` : `Available ${number(holding?.quantity || 0, 8)} ${coin(selected)}`}</small>{notice && <div className="notice">{notice}</div>}</aside>;
}

function Empty({ text }) { return <div className="empty"><Mark /><p>{text}</p></div>; }

export default function App() {
  const [session, setSession] = useState(readSession());
  return session ? <Dashboard session={session} onLogout={() => setSession(null)} /> : <Auth onAuth={setSession} />;
}
