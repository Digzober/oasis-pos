import { DEFAULT_THEME, THEMES, THEME_COOKIE_NAME, THEME_STORAGE_KEY } from './registry'

const allowedThemes = JSON.stringify(THEMES.map(theme => theme.id))

export const THEME_INIT_SCRIPT = `(() => {
  const allowed = ${allowedThemes};
  const fallback = ${JSON.stringify(DEFAULT_THEME)};
  let stored = '';
  try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || ''; } catch {}
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(${JSON.stringify(`${THEME_COOKIE_NAME}=`)}));
  const persisted = stored || (cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '');
  document.documentElement.dataset.theme = allowed.includes(persisted) ? persisted : fallback;
})()`

export function ThemeBootstrap() {
  return <script id="oasis-theme-bootstrap" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
}
