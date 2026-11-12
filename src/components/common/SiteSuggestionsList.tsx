import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatKm, suggestionReasons, type SuggestionReason } from './siteSuggestions';
import type { SiteSuggestion } from '@/services/api/errors';

interface Props {
  suggestions: SiteSuggestion[];
  /** Fills the form's site field with the chosen site; without it the list is informational. */
  onPick?: (siteId: number) => void;
}

function useReasonText() {
  const { t } = useTranslation();
  return (r: SuggestionReason): string => {
    switch (r.kind) {
      case 'shortage':
        return t('capacity.shortage', { count: r.value });
      case 'freePlaces':
        return r.value === null ? t('capacity.unlimited') : t('capacity.freePlaces', { count: r.value });
      case 'distance':
        return r.value === null ? t('capacity.distanceUnknown') : t('capacity.distanceKm', { km: formatKm(r.value) });
    }
  };
}

/**
 * Sites proposed by a `SITE_CAPACITY_EXCEEDED` rejection (TL-N7), each with why it is proposed. The
 * action is never retried automatically: the user picks another site (or someone raises the
 * capacity) and sends again.
 */
export function SiteSuggestionsList({ suggestions, onPick }: Props) {
  const { t } = useTranslation();
  const reasonText = useReasonText();
  if (suggestions.length === 0) {
    return (
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t('capacity.noSuggestions')}
      </Typography>
    );
  }
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" fontWeight={600}>
        {t('capacity.suggestedSites')}
      </Typography>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none' }}>
        {suggestions.map((s) => (
          <Stack component="li" key={s.workSiteId} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                {s.number} — {s.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {suggestionReasons(s).map(reasonText).join(' · ')}
              </Typography>
            </Box>
            {onPick && (
              <Button size="small" color="inherit" onClick={() => onPick(s.workSiteId)} sx={{ flexShrink: 0 }}>
                {t('capacity.choose')}
              </Button>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
