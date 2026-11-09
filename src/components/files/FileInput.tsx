import { useId, useRef, useState, type DragEvent } from 'react';
import { Box, Button, Chip, FormHelperText, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { DEFAULT_ACCEPT, DEFAULT_MAX_FILE_MB, fileKind, formatBytes, validateFile } from '@/utils/files';
import { brand } from '@/app/theme/brand';
import { useFileProblemText } from './useFileProblemText';

export interface ExistingFile {
  name: string;
  /** Opens the stored file (e.g. through the restricted attachment endpoint). */
  onOpen?: () => void;
}

interface Props {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  required?: boolean;
  disabled?: boolean;
  /** Validation message from the form (required, server error…). */
  error?: string;
  helperText?: string;
  /** A file already stored on the server; a new selection replaces it on submit. */
  existing?: ExistingFile | null;
}

/**
 * Single-file picker used by every upload form: click or drag & drop, type/size validation
 * before anything is sent, image/PDF preview of the local file (object URL revoked automatically),
 * replace and remove. A stored server file is shown separately from a newly selected local file.
 */
export function FileInput({ label, value, onChange, accept = DEFAULT_ACCEPT, maxSizeMb = DEFAULT_MAX_FILE_MB, required, disabled, error, helperText, existing }: Props) {
  const { t } = useTranslation();
  const problemText = useFileProblemText();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [rejection, setRejection] = useState<string | null>(null);

  // Rejected files never reach the form value; the reason is shown under the field.
  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 1) return setRejection(t('files.singleOnly'));
    const file = files[0];
    const problem = validateFile(file, { accept, maxMb: maxSizeMb });
    if (problem) return setRejection(`${file.name}: ${problemText(problem)}`);
    setRejection(null);
    onChange(file);
  };
  const browse = () => inputRef.current?.click();
  const shownError = rejection ?? error;

  return (
    <Box>
      <Typography component="label" htmlFor={inputId} variant="body2" sx={{ display: 'block', mb: 0.75, fontWeight: 500, color: shownError ? 'error.main' : 'text.secondary' }}>
        {label}
        {required ? ' *' : ''}
      </Typography>
      <input
        ref={inputRef}
        id={inputId}
        hidden
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files);
          // Allow choosing the same file again after removing it.
          e.target.value = '';
        }}
      />
      {value ? (
        <SelectedFile
          file={value}
          replacing={!!existing}
          invalid={!!shownError}
          disabled={disabled}
          onReplace={browse}
          onRemove={() => {
            setRejection(null);
            onChange(null);
          }}
        />
      ) : (
        <DropZone label={label} accept={accept} maxSizeMb={maxSizeMb} invalid={!!shownError} disabled={disabled} onBrowse={browse} onFiles={pick} />
      )}
      {existing && !value && <ExistingFileRow file={existing} />}
      {(shownError || helperText) && <FormHelperText error={!!shownError}>{shownError ?? helperText}</FormHelperText>}
    </Box>
  );
}

interface DropZoneProps {
  label: string;
  accept: string;
  maxSizeMb: number;
  invalid: boolean;
  disabled?: boolean;
  onBrowse: () => void;
  onFiles: (files: FileList) => void;
}

function DropZone({ label, accept, maxSizeMb, invalid, disabled, onBrowse, onFiles }: DropZoneProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(e.dataTransfer.files);
  };
  const tokens = accept.split(',').map((x) => x.trim().toLowerCase());
  const pdfOnly = tokens.every((x) => x === 'application/pdf' || x === '.pdf');
  const types = accept === DEFAULT_ACCEPT ? t('files.pdfOrImage') : pdfOnly ? t('files.pdfOnly') : accept;
  const borderColor = invalid ? 'error.main' : dragging ? 'primary.main' : brand.inputLine;
  return (
    <Box
      role="group"
      aria-label={label}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      sx={{
        p: 2,
        border: '1.5px dashed',
        borderColor,
        borderRadius: 2,
        bgcolor: dragging ? brand.tealSoft : brand.surfaceHead,
        textAlign: 'center',
        transition: 'background-color 120ms, border-color 120ms',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <CloudUploadOutlinedIcon sx={{ color: 'text.secondary', mb: 0.5 }} />
      <Typography variant="body2" color="text.secondary">
        {t('files.dropHere')}
      </Typography>
      <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={onBrowse} disabled={disabled}>
        {t('files.choose')}
      </Button>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        {t('files.acceptHint', { types, max: maxSizeMb })}
      </Typography>
    </Box>
  );
}

interface SelectedFileProps {
  file: File;
  replacing: boolean;
  invalid: boolean;
  disabled?: boolean;
  onReplace: () => void;
  onRemove: () => void;
}

/** The newly selected local file: thumbnail/preview, size, replace and remove. */
function SelectedFile({ file, replacing, invalid, disabled, onReplace, onRemove }: SelectedFileProps) {
  const { t, i18n } = useTranslation();
  const kind = fileKind(file);
  const preview = useObjectUrl(kind === 'other' ? null : file);
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1, border: 1, borderColor: invalid ? 'error.main' : 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 1.5, overflow: 'hidden', bgcolor: brand.creamSoft, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
        <FileThumb kind={kind} preview={preview} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap title={file.name}>
          {file.name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {formatBytes(file.size, i18n.language)}
          </Typography>
          <Chip size="small" label={replacing ? t('files.replacesCurrent') : t('files.new')} sx={{ height: 18 }} />
        </Stack>
      </Box>
      {preview && (
        <Tooltip title={t('files.preview')}>
          <IconButton size="small" component="a" href={preview} target="_blank" rel="noopener" aria-label={t('files.preview')}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <FileAction label={t('files.replace')} disabled={disabled} onClick={onReplace} icon={<SwapHorizIcon fontSize="small" />} />
      <FileAction label={t('files.remove')} disabled={disabled} onClick={onRemove} icon={<CloseIcon fontSize="small" />} />
    </Stack>
  );
}

function FileThumb({ kind, preview }: { kind: ReturnType<typeof fileKind>; preview: string | null }) {
  if (kind === 'image' && preview) return <Box component="img" src={preview} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  if (kind === 'pdf') return <PictureAsPdfOutlinedIcon />;
  return <InsertDriveFileOutlinedIcon />;
}

function FileAction({ label, icon, disabled, onClick }: { label: string; icon: JSX.Element; disabled?: boolean; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled} aria-label={label}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** A file already stored on the server (kept unless a new one is chosen). */
function ExistingFileRow({ file }: { file: ExistingFile }) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
      <Chip size="small" variant="outlined" label={t('files.current')} />
      <Typography variant="caption" noWrap sx={{ minWidth: 0 }}>
        {file.name}
      </Typography>
      {file.onOpen && (
        <Button size="small" onClick={file.onOpen}>
          {t('common.open')}
        </Button>
      )}
    </Stack>
  );
}
