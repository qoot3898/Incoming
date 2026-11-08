/**
 * Layout tokens shared by the shell and pages, so widths and paddings are defined once.
 * (Colors live in brand.ts; MUI breakpoints are the defaults: sm 600, md 900, lg 1200, xl 1536.)
 */
export const layout = {
  /** Expanded sidebar. */
  drawerWidth: 264,
  /** Collapsed (icon-only) sidebar on desktop. */
  drawerCollapsedWidth: 72,
  /** Sidebar brand row and top app bar height. */
  headerHeight: 64,
  /** Max width of the main content column. */
  contentMaxWidth: 1480,
  /** Main content padding per breakpoint (theme spacing units). */
  pagePadding: { xs: 2, sm: 3, lg: 4 },
  /** Page widths for focused content (forms, account pages). */
  pageWidth: { form: 880, wide: 1040, narrow: 560 },
} as const;
