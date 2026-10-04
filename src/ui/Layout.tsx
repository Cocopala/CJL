import { HashRouter, NavLink, Route, Routes } from 'react-router';
import Train from './pages/Train';
import History from './pages/History';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <HashRouter>
      <div className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.brand}>Commercial Judgment Lab</p>
          <nav aria-label="Main navigation" className={styles.nav}>
            <NavLink to="/" end>Train</NavLink>
            <NavLink to="/history">History</NavLink>
            <NavLink to="/profile">Profile</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </header>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Train />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <footer className={styles.footer}>
          CJL is a training tool. It is not legal, accounting or financial advice.
        </footer>
      </div>
    </HashRouter>
  );
}
