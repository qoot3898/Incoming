import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAVIGATION, type NavItem, type NavSection } from '@/constants/navigation';
import { useAuth } from '@/app/providers/authContext';
import { brand, onTeal } from '@/app/theme/brand';
import { layout } from '@/app/theme/layout';
import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

type TipSide = 'left' | 'right';

/** Longest matching route prefix wins, so `/attendance/incidents` selects "Incidents", not "Attendance". */
function matchLength(pathname: string, item: NavItem): number {
  if (item.to === '/') return pathname === '/' ? 1 : 0;
  return [item.to, ...(item.matches ?? [])].reduce((best, prefix) => (pathname === prefix || pathname.startsWith(`${prefix}/`) ? Math.max(best, prefix.length) : best), 0);
}

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])]);
}

function findActiveKey(sections: NavSection[], pathname: string): string {
  let best = { key: '', len: 0 };
  sections.forEach((s) =>
    flatten(s.items).forEach((i) => {
      const len = matchLength(pathname, i);
      if (len > best.len) best = { key: i.key, len };
    }),
  );
  return best.key;
}

/** Tooltips open toward the content, away from the screen edge the rail sits on. */
function useTipSide(): TipSide {
  const { i18n } = useTranslation();
  return i18n.dir(i18n.language) === 'rtl' ? 'left' : 'right';
}

interface SidebarProps {
  /** Icon-only rail (desktop). */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called after a navigation link is used (closes the mobile drawer). */
  onNavigate?: () => void;
  /** Mobile drawer: shows the language switch in the footer (it is hidden in the phone app bar). */
  mobile?: boolean;
}

/**
 * Sidebar with three rows: a fixed brand header, the navigation (the only scrolling part,
 * `min-height: 0` so it shrinks instead of pushing the whole drawer into a second scrollbar)
 * and a fixed footer with the signed-in user and the collapse control.
 */
export function Sidebar({ collapsed = false, onToggleCollapsed, onNavigate, mobile }: SidebarProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: brand.teal, color: onTeal.text, overflow: 'hidden' }}>
      <SidebarBrand collapsed={collapsed} />
      <Divider sx={{ borderColor: onTeal.divider }} />
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      <Divider sx={{ borderColor: onTeal.divider }} />
      <SidebarFooter collapsed={collapsed} mobile={mobile} onToggleCollapsed={onToggleCollapsed} />
    </Box>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={collapsed ? 'center' : 'flex-start'} sx={{ px: collapsed ? 0 : 2.5, height: layout.headerHeight, flexShrink: 0 }}>
      <BrandMark size={34} />
      {!collapsed && (
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} color={brand.cream} lineHeight={1.2} noWrap>
            {t('app.company')}
          </Typography>
          <Typography variant="caption" sx={{ color: onTeal.textMuted, display: 'block' }} noWrap>
            {t('app.name')}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const tip = useTipSide();
  const { pathname } = useLocation();
  const { can } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  const sections = useMemo(
    () =>
      NAVIGATION.map(
        (section): NavSection => ({
          ...section,
          items: section.items.filter((i) => can(i.permissions)).map((i) => ({ ...i, children: i.children?.filter((c) => can(c.permissions)) })),
        }),
      ).filter((s) => s.items.length > 0),
    [can],
  );
  const activeKey = useMemo(() => findActiveKey(sections, pathname), [sections, pathname]);

  // Keep the active entry visible in a long menu (deep links, back/forward, collapsed rail).
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, collapsed]);

  return (
    <Box
      component="nav"
      ref={navRef}
      aria-label={t('nav.main')}
      sx={{
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        px: collapsed ? 1 : 1.5,
        py: 1,
        scrollbarWidth: 'thin',
        scrollbarColor: `${onTeal.divider} transparent`,
      }}
    >
      {sections.map((section, index) => (
        <List key={section.key} dense disablePadding sx={{ mb: 0.5 }} subheader={<SectionHeading sectionKey={section.key} collapsed={collapsed} first={index === 0} />}>
          {section.items.map((item) => (
            <NavEntry key={item.key} item={item} activeKey={activeKey} collapsed={collapsed} onNavigate={onNavigate} depth={0} tip={tip} />
          ))}
        </List>
      ))}
    </Box>
  );
}

function SectionHeading({ sectionKey, collapsed, first }: { sectionKey: string; collapsed: boolean; first: boolean }) {
  const { t } = useTranslation();
  if (collapsed) return first ? null : <Divider sx={{ borderColor: onTeal.divider, my: 1 }} />;
  return (
    <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: onTeal.textFaint, fontSize: '0.72rem', lineHeight: '32px', px: 1.5 }}>
      {t(`nav.sections.${sectionKey}`)}
    </ListSubheader>
  );
}

function SidebarFooter({ collapsed, mobile, onToggleCollapsed }: { collapsed: boolean; mobile?: boolean; onToggleCollapsed?: () => void }) {
  const { t } = useTranslation();
  const tip = useTipSide();
  const { user } = useAuth();
  const name = user?.fullName || user?.userName || '';
  return (
    <Box sx={{ flexShrink: 0, px: collapsed ? 1 : 1.5, py: 1.25 }}>
      <Stack direction={collapsed ? 'column' : 'row'} spacing={1} alignItems="center">
        <Tooltip title={collapsed ? name : ''} placement={tip}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: brand.cream, color: brand.teal, fontSize: '0.9rem', fontWeight: 700 }}>{(name || '?').trim().slice(0, 1)}</Avatar>
        </Tooltip>
        {!collapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={600} color={brand.cream} noWrap>
              {name}
            </Typography>
            <Typography variant="caption" sx={{ color: onTeal.textMuted, display: 'block' }} noWrap>
              {(user?.roles ?? []).join('، ')}
            </Typography>
          </Box>
        )}
        {mobile && (
          <Box sx={{ color: brand.cream }}>
            <LanguageSwitcher />
          </Box>
        )}
        {onToggleCollapsed && (
          <Tooltip title={collapsed ? t('nav.expand') : t('nav.collapse')} placement={tip}>
            <IconButton
              size="small"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              aria-expanded={!collapsed}
              sx={{ color: onTeal.textMuted, '&:hover': { bgcolor: onTeal.hover, color: brand.cream } }}
            >
              <CollapseIcon collapsed={collapsed} tip={tip} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/**
 * Collapsing moves the rail edge toward the start side (left in LTR, right in RTL);
 * icons are not mirrored by the RTL style plugin, so the arrow is chosen per direction.
 */
function CollapseIcon({ collapsed, tip }: { collapsed: boolean; tip: TipSide }) {
  const pointsLeft = collapsed === (tip === 'left');
  return pointsLeft ? <KeyboardDoubleArrowLeftIcon fontSize="small" /> : <KeyboardDoubleArrowRightIcon fontSize="small" />;
}

interface EntryProps {
  item: NavItem;
  activeKey: string;
  collapsed: boolean;
  depth: number;
  tip: TipSide;
  onNavigate?: () => void;
}

function NavEntry({ item, activeKey, collapsed, depth, tip, onNavigate }: EntryProps) {
  const { t } = useTranslation();
  const children = item.children ?? [];
  const containsActive = children.length > 0 && flatten(children).some((x) => x.key === activeKey);
  const [open, setOpen] = useState(containsActive);
  // Open the group that holds the active route — derived during render, no effect.
  const [seenActive, setSeenActive] = useState(containsActive);
  if (containsActive !== seenActive) {
    setSeenActive(containsActive);
    if (containsActive) setOpen(true);
  }
  const text = t(`nav.items.${item.key}`);
  const showGroup = children.length > 0 && !collapsed;

  const link = (
    <NavLinkButton item={item} text={text} active={item.key === activeKey} highlighted={containsActive} collapsed={collapsed} depth={depth} onNavigate={onNavigate}>
      {showGroup && <GroupToggle open={open} name={text} onToggle={() => setOpen((o) => !o)} />}
    </NavLinkButton>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip title={text} placement={tip}>
          {link}
        </Tooltip>
      ) : (
        link
      )}
      {showGroup && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {children.map((c) => (
              <NavEntry key={c.key} item={c} activeKey={activeKey} collapsed={collapsed} depth={depth + 1} tip={tip} onNavigate={onNavigate} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

interface LinkButtonProps {
  item: NavItem;
  text: string;
  active: boolean;
  /** A child route is active (group parent). */
  highlighted: boolean;
  collapsed: boolean;
  depth: number;
  onNavigate?: () => void;
  children?: ReactNode;
}

/** forwardRef: the collapsed rail wraps it in a Tooltip, which needs the DOM node as anchor. */
const NavLinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function NavLinkButton({ item, text, active, highlighted, collapsed, depth, onNavigate, children, ...rest }, ref) {
  const Icon = item.icon;
  return (
    <ListItemButton
      {...rest}
      ref={ref}
      component={RouterLink}
      to={item.to}
      selected={active}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      sx={{
        mb: 0.25,
        minHeight: 40,
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed ? 1 : 1.5,
        paddingInlineStart: collapsed ? 1 : 1.5 + depth * 2,
        color: active ? brand.cream : onTeal.text,
        '&:hover': { bgcolor: onTeal.hover },
        '&.Mui-selected': { bgcolor: onTeal.selected, color: brand.cream },
        '&.Mui-selected:hover': { bgcolor: onTeal.selectedHover },
        '&.Mui-focusVisible': { outline: `2px solid ${brand.leaf}`, outlineOffset: -2 },
      }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: active || highlighted ? brand.leaf : onTeal.textMuted, justifyContent: 'center' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      {!collapsed && <ListItemText primary={text} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, noWrap: true }} />}
      {children}
    </ListItemButton>
  );
});

function GroupToggle({ open, name, onToggle }: { open: boolean; name: string; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <IconButton
      size="small"
      edge="end"
      aria-label={open ? t('nav.collapseGroup', { name }) : t('nav.expandGroup', { name })}
      aria-expanded={open}
      onClick={(e) => {
        // Expanding a group must not follow the parent link.
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      sx={{ color: 'inherit' }}
    >
      {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
    </IconButton>
  );
}
