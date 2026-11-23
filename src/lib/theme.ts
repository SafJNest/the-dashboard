export type ThemeName = 'dark' | 'light';

export class Theme {
  static readonly COOKIE = 'beebot_theme';
  static readonly DEFAULT: ThemeName = 'dark';
  static readonly MAX_AGE = 60 * 60 * 24 * 365;
  static readonly PATTERN = new RegExp(`(?:^|;\\s*)${Theme.COOKIE}=(dark|light)(?:;|$)`);
  static readonly SCRIPT = `document.documentElement.dataset.theme = (document.cookie.match(${Theme.PATTERN}) || [])[1] || '${Theme.DEFAULT}';`;

  static fromCookie(header: string | undefined): ThemeName {
    const match = header?.match(Theme.PATTERN);
    return match ? match[1] as ThemeName : Theme.DEFAULT;
  }

  static current(): ThemeName {
    return document.documentElement.dataset.theme === 'light' ? 'light' : Theme.DEFAULT;
  }

  static apply(theme: ThemeName) {
    document.documentElement.dataset.theme = theme;
    document.cookie = `${Theme.COOKIE}=${theme}; path=/; max-age=${Theme.MAX_AGE}; samesite=lax`;
  }
}
