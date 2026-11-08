import { Suspense, useState, type FormEvent } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/authContext';
import { LoadingState } from '@/components/common/States';
import { brand } from '@/app/theme/brand';
import { layout } from '@/app/theme/layout';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationsMenu } from './NotificationsMenu';

const COLLAPSED_KEY = 'qoot.labor.sidebarCollapsed';

/** Per-browser UI preference; storage can be unavailable (private mode), so every access is guarded. */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    /* preference stays for this session only */
  }
}

function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const initials = (user?.fullName || user?.userName || '?').trim().slice(0, 1);
  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('header.account')} sx={{ p: 0.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: brand.cream, color: brand.teal, fontSize: '0.9rem', fontWeight: 700 }}>{initials}</Avatar>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 220 } } }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{user?.fullName || user?.userName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {(user?.roles ?? []).join('، ')}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/change-password');
          }}
        >
          {t('auth.changePassword')}
        </MenuItem>
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          {t('auth.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}

function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    navigate(text ? `/workers?Text=${encodeURIComponent(text)}` : '/workers');
  };
  return (
    <Box
      component="form"
      onSubmit={submit}
      role="search"
      sx={{ display: 'flex', alignItems: 'center', bgcolor: brand.creamSoft, border: 1, borderColor: brand.creamLine, borderRadius: 2, px: 1.5, height: 38, width: { xs: '100%', sm: 340 } }}
    >
      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      <InputBase
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('header.searchPlaceholder')}
        inputProps={{ 'aria-label': t('header.searchPlaceholder') }}
        sx={{ mx: 1, flex: 1, fontSize: '0.875rem' }}
      />
    </Box>
  );
}

export function AppLayout() {
  const theme = useTheme();
  // noSsr: read the media query on the first render so desktop never mounts the mobile drawer first.
  const desktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { t } = useTranslation();
  const width = desktop ? (collapsed ? layout.drawerCollapsedWidth : layout.drawerWidth) : 0;
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(next);
  };
  const transition = theme.transitions.create('width', { duration: theme.transitions.duration.shorter });

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <a href="#main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      {/* Reserves the docked sidebar's width so content never slides underneath it. */}
      <Box component="aside" sx={{ width, flexShrink: 0, transition }}>
        {desktop ? (
          <Drawer variant="permanent" open PaperProps={{ sx: { width, border: 0, overflow: 'hidden', transition } }}>
            <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: `min(${layout.drawerWidth}px, 86vw)`, border: 0, overflow: 'hidden' } }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} mobile />
          </Drawer>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ gap: { xs: 1, sm: 1.5 }, minHeight: { xs: 56, sm: layout.headerHeight }, px: { xs: 1.5, sm: 3 } }}>
            {!desktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label={t('header.openMenu')}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, display: 'flex', minWidth: 0 }}>
              <GlobalSearch />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <LanguageSwitcher />
            </Box>
            <NotificationsMenu />
            <UserMenu />
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          id="main"
          tabIndex={-1}
          sx={{ flex: 1, p: layout.pagePadding, maxWidth: layout.contentMaxWidth, width: '100%', mx: 'auto', outline: 'none', minWidth: 0 }}
        >
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
