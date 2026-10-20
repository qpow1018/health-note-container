const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
];

export function isYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      YOUTUBE_HOSTS.includes(url.hostname) &&
      url.username === '' &&
      url.password === '' &&
      url.pathname !== '/'
    );
  } catch {
    return false;
  }
}

export function getYoutubeVideoId(value: string): string | null {
  if (!isYoutubeUrl(value)) return null;

  const url = new URL(value);
  const segments = url.pathname.split('/').filter(Boolean);
  let videoId: string | null = null;

  if (url.hostname === 'youtu.be') {
    videoId = segments.length === 1 ? segments[0] : null;
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else if (segments.length === 2 && ['shorts', 'embed', 'live'].includes(segments[0])) {
    videoId = segments[1];
  }

  return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
}
