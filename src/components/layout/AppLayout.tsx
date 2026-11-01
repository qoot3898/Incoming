import { Suspense, useState, type FormEvent } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAVIGATION } from '@/constants/navigation';
import { useAuth } from '@/app/providers/authContext';
import { LoadingState } from '@/components/common/States';
import { brand, onTeal } from '@/app/theme/brand';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationsMenu } from './NotificationsMenu';

const DRAWER = 264;

function isActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  if (to === '/attendance') return pathname === '/attendance' || pathname.startsWith('/attendance/sheets');
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { can } = useAuth();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: brand.teal, color: onTeal.text }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, height: 64, flexShrink: 0 }}>
        <BrandMark size={34} />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} color={brand.cream} lineHeight={1.2}>
            {t('app.company')}
          </Typography>
          <Typography variant="caption" sx={{ color: onTeal.textMuted }}>
            {t('app.name')}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ borderColor: onTeal.divider }} />
      <Box component="nav" aria-label={t('nav.main')} sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {NAVIGATION.map((section) => {
          const items = section.items.filter((i) => can(i.permissions));
          if (!items.length) return null;
          return (
            <List
              key={section.key}
              dense
              subheader={
                <ListSubheader
                  disableSticky
                  sx={{ bgcolor: 'transparent', color: onTeal.textFaint, fontSize: '0.72rem', lineHeight: '32px', px: 1.5 }}
                >
                  {t(`nav.sections.${section.key}`)}
                </ListSubheader>
              }
            >
              {items.map((i) => {
                const Icon = i.icon;
                const active = isActive(pathname, i.to);
                return (
                  <ListItemButton
                    key={i.key}
                    component={NavLink}
                    to={i.to}
                    end={i.to === '/'}
                    selected={active}
                    onClick={onNavigate}
                    sx={{
                      mb: 0.25,
                      color: active ? brand.cream : onTeal.text,
                      '&:hover': { bgcolor: onTeal.hover },
                      '&.Mui-selected': { bgcolor: onTeal.selected, color: brand.cream },
                      '&.Mui-selected:hover': { bgcolor: onTeal.selectedHover },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: active ? brand.leaf : onTeal.textMuted }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t(`nav.items.${i.key}`)} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }} />
                  </ListItemButton>
                );
              })}
            </List>
          );
        })}
      </Box>
    </Box>
  );
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
  const desktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <a href="#main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Box component="aside" sx={{ width: { lg: DRAWER }, flexShrink: 0 }}>
        {desktop ? (
          <Drawer variant="permanent" open PaperProps={{ sx: { width: DRAWER, border: 0 } }}>
            <Sidebar />
          </Drawer>
        ) : (
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: DRAWER, border: 0 } }}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60, sm: 64 } }}>
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
        <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1480, width: '100%', mx: 'auto', outline: 'none' }}>
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
