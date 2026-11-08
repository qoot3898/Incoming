import type { SvgIconComponent } from '@mui/icons-material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import FlightTakeoffOutlinedIcon from '@mui/icons-material/FlightTakeoffOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import { NAV_PERMISSIONS } from './permissions';

export interface NavItem {
  key: string;
  to: string;
  icon: SvgIconComponent;
  permissions: readonly string[];
  /**
   * Nested entries rendered as an expandable group under this item (the group opens
   * automatically when one of its routes is active). The current menu is one level deep.
   */
  children?: NavItem[];
  /** Extra path prefixes that also mark this item active (e.g. detail routes outside `to`). */
  matches?: string[];
}

export interface NavSection {
  key: string;
  items: NavItem[];
}

const item = (key: string, to: string, icon: SvgIconComponent): NavItem => ({ key, to, icon, permissions: NAV_PERMISSIONS[key] ?? [] });

export const NAVIGATION: NavSection[] = [
  { key: 'general', items: [item('tasks', '/', InboxOutlinedIcon), item('workers', '/workers', BadgeOutlinedIcon)] },
  {
    key: 'recruitment',
    items: [
      item('staffing', '/staffing-requests', AssignmentOutlinedIcon),
      item('candidates', '/candidates', PeopleAltOutlinedIcon),
      item('registration', '/registration', HowToRegOutlinedIcon),
      item('permits', '/entry-permits', ConfirmationNumberOutlinedIcon),
    ],
  },
  {
    key: 'onboarding',
    items: [item('onboarding', '/onboarding', RocketLaunchOutlinedIcon), item('payroll', '/payroll-notices', ReceiptLongOutlinedIcon)],
  },
  {
    key: 'daily',
    items: [
      item('attendance', '/attendance', EventAvailableOutlinedIcon),
      item('incidents', '/attendance/incidents', ReportProblemOutlinedIcon),
      item('leaves', '/leaves', FlightTakeoffOutlinedIcon),
      item('penalties', '/penalties', GavelOutlinedIcon),
      item('transfers', '/transfers', SwapHorizOutlinedIcon),
      item('evaluations', '/evaluations', FactCheckOutlinedIcon),
    ],
  },
  { key: 'exit', items: [item('terminations', '/terminations', LogoutOutlinedIcon)] },
  { key: 'reporting', items: [item('reports', '/reports', AssessmentOutlinedIcon)] },
  {
    key: 'admin',
    items: [
      item('users', '/admin/users', ManageAccountsOutlinedIcon),
      item('roles', '/admin/roles', AdminPanelSettingsOutlinedIcon),
      item('directories', '/admin/directories', ListAltOutlinedIcon),
      item('laborSettings', '/admin/labor-settings', AccountTreeOutlinedIcon),
      item('settings', '/admin/settings', TuneOutlinedIcon),
      item('audit', '/admin/audit', HistoryOutlinedIcon),
      item('integration', '/admin/integration', SyncAltOutlinedIcon),
      item('backups', '/admin/backups', BackupOutlinedIcon),
    ],
  },
];
