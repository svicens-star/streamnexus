import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { auth, googleProvider, signInWithPopup, signOut, db, collection, onSnapshot, query, where, doc, setDoc, deleteDoc, getDoc, getDocs, signInWithEmailAndPassword, createUserWithEmailAndPassword, handleFirestoreError, OperationType } from './lib/firebase';
import { Play, Shield, User, LogOut, Tv, Package, Search, Image as ImageIcon, Volume2, LayoutDashboard, X, Maximize2, Settings, AlertTriangle, Trash2, Menu, Download, Smartphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from './lib/gemini';
import { Toaster, toast } from 'sonner';
import videojs from 'video.js';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import 'video.js/dist/video-js.css';
import autoPackM3U from '../playlist.m3u?raw';
import legalSportsChannelsRaw from '../legal-sports-channels.json?raw';
import { BRANDS, GENRE_OPTIONS, type BrandMeta } from './data/brands';
import { HomeRows } from './components/HomeRows';
import { BrandHub } from './components/BrandHub';
import { ChannelsBrowser } from './components/ChannelsBrowser';
import { AppUpdatePanel } from './components/AppUpdatePanel';
import { MusicPlayer } from './components/MusicPlayer';
import {
  saveProgress,
  subscribeContinueWatching,
  getItemProgress,
  type ProgressRecord,
} from './lib/progress';
import {
  attachVhsHttpProxyOnRequest,
  getHlsHttpProxyPrefix,
  shouldProxyHttpStreams,
  wrapHttpStreamUrlWithProxy,
} from './lib/stream-proxy';

// --- Components ---

/** Referencia estable para `streamAlternatives ?? []` y evitar re-montar VideoPlayer cada render. */
const EMPTY_STREAM_SOURCES: string[] = [];

type ChannelCategory = 'news' | 'sports' | 'movies' | 'kids' | 'streaming' | 'series' | 'apps';

/** Repo público de la app: enlaces de instalación y releases. */
const PUBLIC_GITHUB_RELEASES_LATEST = 'https://github.com/svicens-star/streamnexus/releases/latest';
/** APK público (CDN jsDelivr desde el repo) para descargar en TV fuera de tu red local. */
const PUBLIC_GITHUB_TV_APK_LATEST =
  'https://cdn.jsdelivr.net/gh/svicens-star/streamnexus@main/public/downloads/StreamNexus-TV-install.apk';

const STREAMING_APPS = [
  { name: 'LUZU TV', url: 'https://www.youtube.com/@luzutv', color: '#23D4E3', subtitle: 'Streaming en vivo y clips' },
  { name: 'OLGA', url: 'https://www.youtube.com/@olgaenvivo', color: '#8B5CF6', subtitle: 'Canal digital en vivo' },
  { name: 'VORTERIX', url: 'https://www.youtube.com/@Vorterix', color: '#F97316', subtitle: 'Música y actualidad' },
];

const DEFAULT_STREAMING_CHANNELS = [
  { name: 'LUZU TV (Directo)', externalUrl: 'https://www.youtube.com/@luzutv/live', thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600', tierRequired: 'free', category: 'streaming', description: 'Canal digital en vivo' },
  { name: 'OLGA (Directo)', externalUrl: 'https://www.youtube.com/@olgaenvivo/live', thumbnailUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600', tierRequired: 'free', category: 'streaming', description: 'Streaming en vivo y entrevistas' },
  { name: 'Vorterix (Directo)', externalUrl: 'https://www.youtube.com/@Vorterix/live', thumbnailUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600', tierRequired: 'free', category: 'streaming', description: 'Música y actualidad en vivo' },
];

const DEFAULT_ARGENTINA_LIVE_CHANNELS = [
  { name: 'TV Pública Argentina', externalUrl: 'https://www.youtube.com/@TVPublicaArgentina/live', thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / señal oficial' },
  { name: 'Telefe en vivo', externalUrl: 'https://mitelefe.com/vivo/', thumbnailUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / aire nacional oficial' },
  { name: 'eltrece en vivo', externalUrl: 'https://www.eltrecetv.com.ar/vivo/', thumbnailUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / aire nacional oficial' },
  { name: 'América TV en vivo', externalUrl: 'https://www.americatv.com.ar/vivo', thumbnailUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / aire nacional oficial' },
  { name: 'El Nueve en vivo', externalUrl: 'https://www.elnueve.com.ar/vivo', thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / aire nacional oficial' },
  { name: 'TN en vivo', externalUrl: 'https://tn.com.ar/envivo/', thumbnailUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
  { name: 'C5N en vivo', externalUrl: 'https://www.c5n.com/vivo', thumbnailUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
  { name: 'A24 en vivo', externalUrl: 'https://www.a24.com/vivo', thumbnailUrl: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
  { name: 'LN+ en vivo', externalUrl: 'https://www.lanacion.com.ar/lnmas-en-vivo/', thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
  { name: 'Crónica HD en vivo', externalUrl: 'https://www.cronica.com.ar/tv', thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
  { name: 'Canal 26 en vivo', externalUrl: 'https://www.canal26.com/en-vivo', thumbnailUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600', tierRequired: 'free', category: 'news', description: 'Argentina en vivo / noticias oficiales' },
];

const DEFAULT_SPORTS_CHANNELS = [
  { name: 'FIFA+ (Oficial)', externalUrl: 'https://www.plus.fifa.com/', thumbnailUrl: 'https://digitalhub.fifa.com/transform/2f5bd9ef-7848-48ae-b335-6f42f6f0db5d/FIFA_Logo?io=transform:fill,height:512,width:512&quality=75', tierRequired: 'free', category: 'sports', description: 'Streaming oficial de FIFA+' },
  { name: 'Red Bull TV', externalUrl: 'https://www.redbull.com/int-en/live', thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png', tierRequired: 'free', category: 'sports', description: 'Eventos deportivos y shows en vivo' },
];

const DEFAULT_FOOTBALL_PACK_CHANNELS = [
  { name: 'Pack Fútbol - TNT Sports', externalUrl: 'https://tntsports.com.ar/', thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600', tierRequired: 'premium', category: 'sports', description: 'Pack Fútbol / acceso oficial para clientes habilitados' },
  { name: 'Pack Fútbol - ESPN Premium', externalUrl: 'https://www.disneyplus.com/es-ar', thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600', tierRequired: 'premium', category: 'sports', description: 'Pack Fútbol / ESPN y Disney+ según suscripción' },
  { name: 'TyC Sports Play', externalUrl: 'https://play.tycsports.com/', thumbnailUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600', tierRequired: 'basic', category: 'sports', description: 'Fútbol argentino y deportes / acceso oficial' },
  { name: 'Deportv', externalUrl: 'https://www.deportv.gob.ar/', thumbnailUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600', tierRequired: 'free', category: 'sports', description: 'Deportes argentinos / señal oficial' },
  { name: 'AFA Play', externalUrl: 'https://www.afaplay.com/', thumbnailUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600', tierRequired: 'basic', category: 'sports', description: 'Fútbol argentino / plataforma oficial AFA' },
  { name: 'Liga Profesional', externalUrl: 'https://www.ligaprofesional.ar/', thumbnailUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=600', tierRequired: 'free', category: 'sports', description: 'Fútbol argentino / fixture, noticias y contenido oficial' },
  { name: 'Flow - Pack Fútbol', externalUrl: 'https://www.flow.com.ar/', thumbnailUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600', tierRequired: 'premium', category: 'sports', description: 'Pack Fútbol / abrir plataforma oficial Flow' },
  { name: 'DGO - Fútbol Argentino', externalUrl: 'https://www.directvgo.com/ar/', thumbnailUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600', tierRequired: 'premium', category: 'sports', description: 'Pack Fútbol / abrir plataforma oficial DGO' },
  { name: 'Telecentro Play - Pack Fútbol', externalUrl: 'https://telecentro.com.ar/play', thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600', tierRequired: 'premium', category: 'sports', description: 'Pack Fútbol / abrir plataforma oficial Telecentro Play' },
];

/** Pluto, Plex, Runtime: categoría apps (pestaña Aplicaciones), no Series ni Películas. */
const DEFAULT_APPS_CHANNELS = [
  {
    name: 'Pluto TV',
    externalUrl: 'https://pluto.tv/latam/live-tv',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Pluto_TV_logo.svg/512px-Pluto_TV_logo.svg.png',
    tierRequired: 'free',
    category: 'apps',
    description: 'App web oficial: TV en vivo, películas y series.',
  },
  {
    name: 'Series - Pluto Acción',
    externalUrl: 'https://pluto.tv/latam/live-tv',
    thumbnailUrl: 'https://images.pluto.tv/channels/5f4d8594eb979c0007706de7/colorLogoPNG.png',
    tierRequired: 'free',
    category: 'apps',
    description: 'Pluto TV (acceso desde Aplicaciones).',
  },
  {
    name: 'Series - Runtime',
    externalUrl: 'https://runtime.tv/',
    thumbnailUrl: 'https://i.imgur.com/Iozv4tT.png',
    tierRequired: 'free',
    category: 'apps',
    description: 'Runtime (app web desde Aplicaciones).',
  },
  {
    name: 'Series - Plex TV',
    externalUrl: 'https://watch.plex.tv/live-tv',
    thumbnailUrl: 'https://images.unsplash.com/photo-1616531770192-6eaea74c2456?w=600',
    tierRequired: 'free',
    category: 'apps',
    description: 'Plex TV (app web desde Aplicaciones).',
  },
  {
    name: 'Pluto TV Cine',
    externalUrl: 'https://pluto.tv/latam/live-tv',
    thumbnailUrl: 'https://images.pluto.tv/channels/5de91cf0b7f0a70009dcb3f5/colorLogoPNG.png',
    tierRequired: 'free',
    category: 'apps',
    description: 'Cine en Pluto TV (Aplicaciones).',
  },
  {
    name: 'Plex Películas',
    externalUrl: 'https://watch.plex.tv/live-tv',
    thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
    tierRequired: 'free',
    category: 'apps',
    description: 'Plex (Aplicaciones).',
  },
];

/** Nombres de enlaces externos que deben listarse solo como Aplicaciones (aunque en Firestore figuren como series). */
const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const EXTERNAL_APPS_BY_NAME = new Set(
  [
    'Series - Pluto Acción',
    'Series - Runtime',
    'Series - Plex TV',
    'Pluto TV',
    'Pluto TV Cine',
    'Plex Películas',
    'Plex Peliculas',
  ].map((n) => stripDiacritics(n).toLowerCase())
);

const normalizeChannelForAppsSection = (ch: any) => {
  if (!ch?.externalUrl) return ch;
  const key = stripDiacritics(String(ch.name || '')).toLowerCase();
  if (EXTERNAL_APPS_BY_NAME.has(key)) return { ...ch, category: 'apps' };
  return ch;
};

const isIosWeb = () => {
  const ua = navigator.userAgent || '';
  const isiPhone = /iPhone|iPad|iPod/i.test(ua);
  const isTouchMac = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isiPhone || isTouchMac;
};

/** iOS web is strict: prefer HTTPS HLS-like sources and app links. */
const isLikelyIosPlayableStream = (url: string) => {
  if (!url) return false;
  const s = String(url).toLowerCase().trim();
  if (!s.startsWith('https://')) return false;
  if (s.includes('.m3u8') || s.includes('playlist') || s.includes('/hls/')) return true;
  if (s.includes('youtube.com') || s.includes('youtu.be')) return true;
  return false;
};

const isChannelIosCompatible = (channel: any) => {
  if (!channel) return false;
  if (channel.externalUrl) return true;
  const streamCandidates = [channel.streamUrl, ...(channel.streamAlternatives || [])]
    .filter(Boolean)
    .map(String);
  return streamCandidates.some(isLikelyIosPlayableStream);
};

const isLikelyTvCompatibleStream = (url: string) => {
  if (!url) return false;
  const s = String(url).toLowerCase().trim();
  if (!s.startsWith('https://')) return false;
  if (s.includes('.m3u8') || s.includes('playlist') || s.includes('/hls/')) return true;
  if (s.includes('youtube.com') || s.includes('youtu.be')) return true;
  return false;
};

const isChannelTvCompatible = (channel: any) => {
  if (!channel) return false;
  if (channel.externalUrl) return true;
  const streamCandidates = [channel.streamUrl, ...(channel.streamAlternatives || [])]
    .filter(Boolean)
    .map(String);
  if (Capacitor.isNativePlatform()) {
    return streamCandidates.length > 0;
  }
  return streamCandidates.some(isLikelyTvCompatibleStream);
};

const ANDROID_APP_TARGETS: Array<{
  test: RegExp;
  packages: string[];
  storeUrl: string;
  label: string;
}> = [
  {
    test: /netflix\.com/i,
    packages: ['com.netflix.ninja', 'com.netflix.mediaclient'],
    storeUrl: 'market://details?id=com.netflix.ninja',
    label: 'Netflix',
  },
  {
    test: /disneyplus\.com/i,
    packages: ['com.disney.disneyplus'],
    storeUrl: 'market://details?id=com.disney.disneyplus',
    label: 'Disney+',
  },
  {
    test: /spotify\.com|open\.spotify\.com/i,
    packages: ['com.spotify.tv.android', 'com.spotify.music'],
    storeUrl: 'market://details?id=com.spotify.tv.android',
    label: 'Spotify',
  },
  {
    test: /youtube\.com|youtu\.be/i,
    packages: ['com.google.android.youtube.tv', 'com.google.android.youtube'],
    storeUrl: 'market://details?id=com.google.android.youtube.tv',
    label: 'YouTube',
  },
  {
    test: /twitch\.tv/i,
    packages: ['tv.twitch.android.app', 'tv.twitch.android.viewer'],
    storeUrl: 'market://details?id=tv.twitch.android.app',
    label: 'Twitch',
  },
  {
    test: /primevideo\.com/i,
    packages: ['com.amazon.amazonvideo.livingroom', 'com.amazon.avod.thirdpartyclient'],
    storeUrl: 'market://details?id=com.amazon.amazonvideo.livingroom',
    label: 'Prime Video',
  },
];

/** Convierte URLs de YouTube a /embed/ para que el iframe dentro de la app funcione mejor. */
const normalizeExternalPlayerUrl = (raw: string): string => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&playsinline=1`;
      }
      if (u.pathname.startsWith('/shorts/')) {
        const parts = u.pathname.split('/').filter(Boolean);
        const id = parts[1];
        if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
      }
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
    }
  } catch {
    /* ignore */
  }
  return trimmed;
};

const LIVE_TV_CATEGORY_ORDER: { id: ChannelCategory; label: string }[] = [
  { id: 'news', label: 'Noticias / Aire' },
  { id: 'sports', label: 'Deportes' },
  { id: 'movies', label: 'Cine y Series' },
  { id: 'kids', label: 'Infantiles' },
  { id: 'series', label: 'Series' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'apps', label: 'Aplicaciones' },
];

const STREAMING_ONLY_KEYWORDS = [
  'luzu', 'olga', 'vorterix', 'twitch', 'kick', 'streaming', 'podcast', 'youtube'
];

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const stripChannelNoise = (value: unknown) =>
  String(value || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/tvg-logo\s*=\s*["']?[^"'\s]+["']?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const cleanChannelRecord = (channel: any) => ({
  ...channel,
  name: stripChannelNoise(channel?.name) || channel?.name || 'Canal en vivo',
  description: stripChannelNoise(channel?.description),
  currentProgram: stripChannelNoise(channel?.currentProgram || channel?.nowPlaying || ''),
});

const inferCategory = (groupTitleRaw: string, channelName: string): ChannelCategory => {
  const text = `${groupTitleRaw} ${channelName}`.toLowerCase();
  if (text.includes('sport') || text.includes('futbol') || text.includes('fútbol') || text.includes('soccer') || text.includes('deport')) return 'sports';
  if (text.includes('movie') || text.includes('cine') || text.includes('film')) return 'movies';
  if (text.includes('series')) return 'series';
  if (text.includes('kids') || text.includes('infantil') || text.includes('animation')) return 'kids';
  if (STREAMING_ONLY_KEYWORDS.some((k) => text.includes(k))) return 'streaming';
  return 'news';
};

function isBareIpv4Host(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

const parseM3U = (m3uText: string, descriptionPrefix: string) => {
  const lines = m3uText.split('\n');
  const channels = new Map<string, any>();
  const seenStreamUrls = new Set<string>();
  let currentChannel: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);
      const rawChannelName = nameMatch ? nameMatch[1].trim() : 'Canal Desconocido';
      const channelName = stripChannelNoise(rawChannelName) || rawChannelName || 'Canal Desconocido';
      const groupTitle = groupMatch ? groupMatch[1].trim() : 'General';
      currentChannel = {
        name: channelName,
        thumbnailUrl: logoMatch ? logoMatch[1] : 'https://i.imgur.com/XGrkzN3.png',
        category: inferCategory(groupTitle, channelName),
        tierRequired: 'free',
        description: `${descriptionPrefix} / ${groupTitle}`,
      };
      continue;
    }

    if (line.startsWith('http') && currentChannel) {
      // Si el .m3u trae HTTP, a veces conviene guardar también variante HTTPS (solo host con nombre; en IP casi nunca existe).
      const candidates: string[] = [line];
      if (line.toLowerCase().startsWith('http://')) {
        try {
          const host = new URL(line).hostname;
          if (!isBareIpv4Host(host) && !host.includes(':')) {
            const httpsLine = line.replace(/^http:\/\//i, 'https://');
            if (httpsLine !== line) candidates.push(httpsLine);
          }
        } catch {
          /* ignore */
        }
      }

      const channelKey = toSlug(currentChannel.name);
      const existing = channels.get(channelKey);

      for (const candidate of candidates) {
        if (seenStreamUrls.has(candidate)) continue;
        seenStreamUrls.add(candidate);

        if (!existing) {
          channels.set(channelKey, {
            ...currentChannel,
            streamUrl: candidate,
            streamAlternatives: [candidate],
            docId: `${channelKey}-${hashString(channelKey)}`,
          });
          continue;
        }

        if (!existing.streamAlternatives.includes(candidate)) {
          existing.streamAlternatives.push(candidate);
        }

        // Preferir HTTPS como fuente principal cuando exista.
        if (
          candidate.toLowerCase().startsWith('https://') &&
          !String(existing.streamUrl || '').toLowerCase().startsWith('https://')
        ) {
          existing.streamUrl = candidate;
        }
      }
      currentChannel = null;
    }
  }

  return Array.from(channels.values()).map((ch) => ({
    ...ch,
    streamAlternatives: (ch.streamAlternatives || []).slice(0, 5),
  }));
};

const upsertChannels = async (items: any[], replaceExisting = false) => {
  if (!items.length) return 0;
  if (replaceExisting) {
    const existing = await getDocs(collection(db, 'channels'));
    await Promise.all(existing.docs.map((d) => deleteDoc(doc(db, 'channels', d.id))));
  }

  const chunkSize = 250;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((ch) =>
        setDoc(
          doc(db, 'channels', ch.docId || `${toSlug(ch.name)}-${hashString(ch.streamUrl)}`),
          { ...ch, deleted: false },
          { merge: true }
        )
      )
    );
  }
  return items.length;
};

/** Guess MIME for Video.js; many IPTV URLs omit .m3u8 but are still HLS. */
function inferStreamMimeType(url: string, isLive: boolean): string {
  const u = url.toLowerCase();
  if (u.includes('.mpd')) return 'application/dash+xml';
  if (/\.mp4(\?|#|$)/i.test(url) || u.includes('mime=video%2fmp4') || u.includes('mime=video/mp4')) {
    return 'video/mp4';
  }
  if (
    u.includes('.m3u8') ||
    u.includes('m3u8') ||
    u.includes('/hls/') ||
    u.includes('format=m3u8') ||
    u.includes('type=m3u8') ||
    u.includes('type=hls') ||
    u.includes('/live/') ||
    u.includes('/stream/') ||
    (u.includes('playlist') && (u.includes('master') || u.includes('live')))
  ) {
    return 'application/x-mpegURL';
  }
  if (isLive) return 'application/x-mpegURL';
  return 'video/mp4';
}

function alternateStreamMime(primary: string, isLive: boolean): string | null {
  if (primary === 'application/dash+xml') return null;
  if (primary === 'application/x-mpegURL') return 'video/mp4';
  if (primary === 'video/mp4' && isLive) return 'application/x-mpegURL';
  return null;
}

/** Orden de URLs: en HTTPS prioriza alternativas https del M3U; evita https “inventado” sobre IP (casi nunca sirve). */
function buildLiveStreamCandidates(mainSrc: string, alternatives: string[]): string[] {
  const dedup = new Set<string>();
  const out: string[] = [];
  const add = (u?: string | null) => {
    const s = String(u || '').trim();
    if (!s || dedup.has(s)) return;
    dedup.add(s);
    out.push(s);
  };

  const pageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const alts = (alternatives || []).filter(Boolean).map(String);

  if (pageHttps) {
    for (const u of alts) {
      if (u.toLowerCase().startsWith('https://')) add(u);
    }
  }
  add(mainSrc);
  for (const u of alts) add(u);

  if (pageHttps && mainSrc.toLowerCase().startsWith('http://')) {
    try {
      const host = new URL(mainSrc).hostname;
      if (!isBareIpv4Host(host) && !host.includes(':')) {
        const derived = mainSrc.replace(/^http:\/\//i, 'https://');
        add(derived);
      }
    } catch {
      /* ignore */
    }
  }

  return out;
}

const VideoPlayer = ({
  src,
  sources = [],
  onClose,
  zapChannels = [],
  zapCurrentId,
  onZapChannel,
  channelLabel,
  itemId,
  episodeKey,
  initialPosition,
  uid,
  thumbnailUrl,
  isLive = false,
}: {
  src: string;
  sources?: string[];
  onClose: () => void;
  zapChannels?: any[];
  zapCurrentId?: string;
  onZapChannel?: (ch: any) => void;
  channelLabel?: string;
  itemId?: string;
  episodeKey?: string | null;
  initialPosition?: number;
  uid?: string | null;
  thumbnailUrl?: string;
  isLive?: boolean;
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const lastSavedRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const alternativesKey = JSON.stringify([...(sources || [])].map(String).sort());
  const candidateSources = useMemo(
    () => buildLiveStreamCandidates(src, sources || []),
    [src, alternativesKey]
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [mimeFallbackStep, setMimeFallbackStep] = useState(0);
  useEffect(() => {
    setSourceIndex(0);
  }, [src]);

  useEffect(() => {
    setMimeFallbackStep(0);
  }, [src, sourceIndex]);

  const flushProgress = useCallback(
    (force = false) => {
      const player = playerRef.current;
      if (!player || isLive || !uid || !itemId) return;
      try {
        const currentTime = Number(player.currentTime?.() || 0);
        const duration = Number(player.duration?.() || 0);
        if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration < 5) return;
        const now = Date.now();
        if (!force && now - lastSavedRef.current < 5000) return;
        lastSavedRef.current = now;
        void saveProgress(uid, itemId, currentTime, duration, {
          episodeKey: episodeKey || null,
          itemName: channelLabel,
          thumbnailUrl,
        });
      } catch {
        /* ignore */
      }
    },
    [uid, itemId, episodeKey, isLive, channelLabel, thumbnailUrl]
  );

  useEffect(() => {
    const canZap = Boolean(zapChannels.length > 1 && onZapChannel && zapCurrentId);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (!canZap) return;
      const idx = zapChannels.findIndex((c) => c.id === zapCurrentId);
      if (idx < 0) return;
      const prevKeys = new Set(['ArrowUp', 'ArrowLeft', 'PageUp', 'MediaTrackPrevious']);
      const nextKeys = new Set(['ArrowDown', 'ArrowRight', 'PageDown', 'MediaTrackNext']);
      if (!prevKeys.has(e.key) && !nextKeys.has(e.key)) return;
      e.preventDefault();
      const n = zapChannels.length;
      if (prevKeys.has(e.key)) {
        onZapChannel(zapChannels[(idx - 1 + n) % n]);
      } else {
        onZapChannel(zapChannels[(idx + 1) % n]);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [zapChannels, zapCurrentId, onZapChannel, onClose]);

  useEffect(() => {
    if (!videoRef.current) return;
    setError(null);

    const currentSrcRaw = candidateSources[sourceIndex] || src;
    const currentSrc = wrapHttpStreamUrlWithProxy(currentSrcRaw);
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.getAppMeta);
    if (
      !Capacitor.isNativePlatform() &&
      isHttpsPage &&
      currentSrc.startsWith('http://') &&
      !isElectron &&
      !shouldProxyHttpStreams()
    ) {
      setError('Canal no disponible');
      return;
    }

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-city');
    videoRef.current.appendChild(videoElement);

    const primaryMime = inferStreamMimeType(currentSrc, isLive);
    const altMime = alternateStreamMime(primaryMime, isLive);
    const streamType =
      mimeFallbackStep === 1 && altMime != null ? altMime : primaryMime;

    const player = playerRef.current = videojs(videoElement, {
      autoplay: true,
      muted: true,
      playsInline: true,
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      liveui: true,
      html5: {
        vhs: {
          // WebView/Capacitor: nativo. iOS Safari web: nativo HLS. Chrome/Firefox: VHS (MSE).
          overrideNative: Capacitor.isNativePlatform() ? false : !isIosWeb(),
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      },
      sources: [{ src: currentSrc, type: streamType }]
    });

    const proxyPrefix = getHlsHttpProxyPrefix();
    const detachVhsProxy = attachVhsHttpProxyOnRequest(player, proxyPrefix);

    player.ready(() => {
      try {
        void player.play?.()?.catch(() => {});
      } catch {
        /* ignore */
      }
    });

    if (!isLive && itemId && uid && initialPosition && initialPosition > 5) {
      player.one('loadedmetadata', () => {
        try {
          const dur = Number(player.duration?.() || 0);
          if (Number.isFinite(dur) && dur > initialPosition + 5) {
            player.currentTime(initialPosition);
          }
        } catch {
          /* ignore */
        }
      });
    }

    if (!isLive && itemId && uid) {
      player.on('timeupdate', () => flushProgress(false));
      player.on('pause', () => flushProgress(true));
      player.on('ended', () => flushProgress(true));
    }

    if (Capacitor.isNativePlatform()) {
      player.one('playing', () => {
        try {
          const p = player as { requestFullscreen?: () => Promise<void> };
          if (typeof p.requestFullscreen === 'function') {
            void p.requestFullscreen();
          }
        } catch {
          /* ignore */
        }
      });
    }

    player.on('error', () => {
      const err = player.error();
      console.error('VideoJS Error:', err);

      if (sourceIndex < candidateSources.length - 1) {
        setSourceIndex((idx) => idx + 1);
        return;
      }
      const retryMime = alternateStreamMime(inferStreamMimeType(currentSrc, isLive), isLive);
      if (mimeFallbackStep === 0 && retryMime != null) {
        setMimeFallbackStep(1);
        return;
      }
      setError('Canal no disponible');
    });

    return () => {
      detachVhsProxy();
      flushProgress(true);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.innerHTML = '';
      }
    };
  }, [src, sourceIndex, mimeFallbackStep, alternativesKey, flushProgress, initialPosition, isLive, itemId, uid]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[120] rounded-full bg-black/60 p-3 text-white/80 hover:text-white hover:bg-black/80"
        aria-label="Cerrar reproductor"
      >
        <X size={28} />
      </button>
      <div className="flex min-h-0 flex-1 w-full items-stretch justify-center pt-2">
        {error ? (
          <div className="flex max-w-md flex-col items-center justify-center px-6 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger/15">
              <AlertTriangle className="text-danger" size={32} />
            </div>
            <p className="mb-10 text-lg font-bold text-white">Canal no disponible</p>
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  if (sourceIndex < candidateSources.length - 1) {
                    setSourceIndex((idx) => idx + 1);
                  }
                }}
                disabled={sourceIndex >= candidateSources.length - 1}
                className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/15 disabled:opacity-30"
              >
                Probar otra señal
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-accent px-6 py-4 text-[10px] font-black uppercase tracking-widest text-bg transition-all hover:opacity-90"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full min-h-0">
            <div ref={videoRef} className="absolute inset-0 h-full w-full min-h-0" />
            <div className="pointer-events-none absolute bottom-6 left-6 z-[110] flex max-w-[min(92vw,28rem)] flex-col gap-2">
              {channelLabel && (
                <span className="truncate rounded-lg bg-accent/90 px-4 py-2 text-[11px] font-bold text-bg">
                  {channelLabel}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-black/70 px-4 py-2 text-[10px] font-bold text-white backdrop-blur-sm">
                  Fuente {Math.min(sourceIndex + 1, candidateSources.length)}/{candidateSources.length}
                </span>
                {zapChannels.length > 1 && (
                  <span className="rounded-lg bg-black/70 px-4 py-2 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                    Mando: ◀ ▲ ▼ ▶ · salir
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('¡Bienvenido de nuevo!');
      onClose();
    } catch (error: any) {
      let message = 'Error en la autenticación';
      if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
      if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
      if (error.code === 'auth/invalid-email') message = 'Email inválido';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-md p-8 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-dim hover:text-white">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-extrabold text-white mb-2 text-center">
          Iniciar Sesión
        </h2>
        <p className="text-text-dim text-xs text-center mb-6 uppercase tracking-widest font-bold">Solo Usuarios Autorizados</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-dim uppercase mb-1 block">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-dim uppercase mb-1 block">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg py-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
        <p className="mt-6 text-center text-[10px] text-text-dim uppercase font-bold tracking-tighter">
          Si no tienes cuenta, contacta a tu administrador
        </p>
      </motion.div>
    </div>
  );
};

const Navbar = ({ onTabChange, activeTab, onLoginClick }: { onTabChange: (tab: string) => void, activeTab: string, onLoginClick: () => void }) => {
  const { user, profile } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdminUser = profile?.role === 'admin' || (user?.email || '').toLowerCase() === 's.vicens.1160@gmail.com';
  const navItems = [
    { id: 'home', label: 'Inicio' },
    { id: 'music', label: 'Música' },
    { id: 'platforms', label: 'Hubs' },
    { id: 'channels', label: 'En Vivo' },
  ];

  const goTab = (id: string) => {
    onTabChange(id);
    setMobileNavOpen(false);
  };

  return (
    <nav
      className="fixed top-0 w-full z-50 bg-[#07080d]/85 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-8 min-h-[70px] flex items-center justify-between gap-3"
      style={{paddingTop: 'max(12px, env(safe-area-inset-top))'}}
    >
      <div className="flex flex-col gap-0.5 cursor-pointer group shrink-0" onClick={() => goTab('home')}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-7 bg-accent rounded-full group-hover:scale-y-110 transition-transform" />
          <span className="text-lg sm:text-xl font-black tracking-tighter text-white group-hover:text-accent transition-colors uppercase">STREAMNEXUS</span>
        </div>
        <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest pl-5 hidden sm:block">
          TV, cine y fútbol en un solo lugar
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === item.id 
                ? 'bg-white text-bg shadow-xl scale-105' 
                : 'text-text-dim hover:text-white hover:bg-white/5'
            }`}
          >
            {item.label}
          </button>
        ))}
        {isAdminUser && (
          <button 
            onClick={() => onTabChange('admin')}
            className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'admin' 
                ? 'bg-accent text-bg shadow-xl scale-105' 
                : 'text-accent hover:bg-accent/10'
            }`}
          >
            <Settings size={12} /> PANEL
          </button>
        )}
      </div>

      <div className="lg:hidden relative shrink-0">
        <button
          type="button"
          aria-expanded={mobileNavOpen}
          aria-label="Abrir menú"
          onClick={() => setMobileNavOpen((o) => !o)}
          className="p-2.5 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {mobileNavOpen && (
          <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-white/10 bg-bg/95 backdrop-blur-xl shadow-2xl py-2 z-[60] max-h-[70vh] overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTab(item.id)}
                className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                  activeTab === item.id ? 'bg-white text-bg' : 'text-text-dim hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            {isAdminUser && (
              <button
                type="button"
                onClick={() => goTab('admin')}
                className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  activeTab === 'admin' ? 'bg-accent text-bg' : 'text-accent hover:bg-accent/10'
                }`}
              >
                <Settings size={14} /> Panel admin
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {user ? (
          <div className="flex items-center gap-4 bg-surface-light px-2 pr-4 py-1.5 rounded-full border border-white/10">
             <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-black text-bg text-xs">
                {user.email?.[0].toUpperCase()}
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none truncate max-w-[80px]">
                  {profile?.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[8px] font-bold text-accent uppercase tracking-widest leading-none mt-0.5">
                  {profile?.subscriptionTier}
                </span>
             </div>
             <button onClick={() => signOut(auth)} className="ml-2 text-text-dim hover:text-danger transition-colors">
                <LogOut size={16} />
             </button>
          </div>
        ) : (
          <button 
            onClick={onLoginClick}
            className="bg-accent text-bg px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </nav>
  );
};

const Hero = ({ onPlayFeatured }: { onPlayFeatured: () => void }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <section className="relative h-[500px] rounded-3xl overflow-hidden group">
      <img 
        src="https://picsum.photos/seed/stadium/1920/1080" 
        alt="Hero" 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
      <div className="absolute bottom-12 left-12 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-accent text-xs font-bold uppercase tracking-widest">En Vivo Ahora</span>
        </div>
        <h1 className="text-6xl font-black text-white mb-4 tracking-tighter leading-none">SEÑALES EN VIVO <br/> ACTUALIZADAS</h1>
        <p className="text-text-dim text-lg mb-8 font-medium">La portada muestra contenido dinámico. Si un evento ya pasó, no queda fijado en Home.</p>
        <div className="flex gap-4">
          <button 
            onClick={onPlayFeatured}
            className="bg-accent text-bg px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Play size={20} fill="currentColor" /> VER AHORA
          </button>
          <button 
            onClick={() => setShowInfo(true)}
            className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all"
          >
            MÁS INFO
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-lg w-full p-8 relative"
            >
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-text-dim hover:text-white">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">DESTACADO EN VIVO</h2>
              <div className="space-y-4 text-text-dim text-sm leading-relaxed">
                <p>El destacado de inicio es dinámico y se alimenta con canales disponibles de la base. Ya no queda fijo a eventos vencidos.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-light p-4 rounded-xl">
                    <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">Estado</span>
                    <span className="text-white font-bold">Actualizado</span>
                  </div>
                  <div className="bg-surface-light p-4 rounded-xl">
                    <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">Fuente</span>
                    <span className="text-white font-bold">Base de datos</span>
                  </div>
                </div>
                <p className="text-xs italic">Si una señal no responde, usa otra opción del catálogo o importa una lista nueva.</p>
              </div>
              <button 
                onClick={() => { setShowInfo(false); onPlayFeatured(); }}
                className="w-full mt-8 bg-accent text-bg py-4 rounded-xl font-bold hover:opacity-90 transition-all"
              >
                IR AL CANAL
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

const InstallStreamNexusSection = () => {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  const apkUrl =
    (import.meta.env.VITE_ANDROID_APK_URL || '').trim() || PUBLIC_GITHUB_TV_APK_LATEST;
  const releasesUrl =
    (import.meta.env.VITE_ANDROID_RELEASES_URL || '').trim() || PUBLIC_GITHUB_RELEASES_LATEST;
  const playUrl = (import.meta.env.VITE_GOOGLE_PLAY_URL || '').trim();
  const isAndroidBrowser = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIosBrowser =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/i.test(navigator.userAgent) &&
    !(navigator as unknown as { standalone?: boolean }).standalone;

  const primaryHref = apkUrl || releasesUrl;
  const primaryLabel = apkUrl ? 'Descargar APK' : releasesUrl ? 'Ver descargas (GitHub)' : null;

  return (
    <section className="px-12 py-10">
      <div className="glass-card rounded-3xl p-8 md:p-10 border border-white/10 bg-surface/40">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Instalar la app</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-3">
              StreamNexus en Android, TV y iPhone
            </h2>
            <p className="text-text-dim text-sm leading-relaxed mb-6">
              En <strong className="text-white">Android</strong> podés bajar el APK, abrirlo e instalar (teléfono, tablet o
              Android TV con explorador o apps como Downloader). Cuando publiques en{' '}
              <strong className="text-white">Google Play</strong> con el AAB, los usuarios te buscarán por nombre en la
              tienda como cualquier app.
            </p>
            <ol className="text-xs text-text-dim space-y-2 list-decimal list-inside">
              <li>Abrí el enlace de descarga en el dispositivo.</li>
              <li>Descargá el archivo <code className="text-white/90">.apk</code> y tocá <strong className="text-white">Instalar</strong>.</li>
              <li>Si el sistema pide permiso, activá <strong className="text-white">fuentes desconocidas</strong> solo para esa app.</li>
              <li>Al terminar, abrí <strong className="text-white">StreamNexus</strong> desde el cajón de apps o el inicio.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 min-w-[260px]">
            {primaryLabel && primaryHref ? (
              <a
                href={primaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-accent text-bg px-6 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:opacity-95 transition-opacity shadow-lg shadow-accent/20"
              >
                <Download size={18} />
                {primaryLabel}
                <ExternalLink size={14} className="opacity-70" />
              </a>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
                Configurá <code className="text-white">VITE_ANDROID_APK_URL</code> o{' '}
                <code className="text-white">VITE_ANDROID_RELEASES_URL</code> en tu deploy (variables de entorno de Vite) para
                mostrar el botón de descarga.
              </div>
            )}

            {apkUrl && releasesUrl ? (
              <a
                href={releasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/15 transition-colors border border-white/10"
              >
                Todas las versiones
                <ExternalLink size={14} />
              </a>
            ) : null}

            {playUrl ? (
              <a
                href={playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#01875f] text-white px-6 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:opacity-95 transition-opacity"
              >
                Google Play
                <ExternalLink size={14} className="opacity-80" />
              </a>
            ) : (
              <p className="text-[11px] text-text-dim text-center px-2">
                <strong className="text-white">Google Play:</strong> cuando subas el AAB, definí{' '}
                <code className="text-white/80">VITE_GOOGLE_PLAY_URL</code> con el enlace de la ficha y aparecerá el botón verde.
              </p>
            )}

            {isAndroidBrowser && primaryHref ? (
              <p className="text-[10px] text-accent font-bold uppercase tracking-wide text-center">
                Estás en Android: tocá «Descargar» y abrí el APK al finalizar.
              </p>
            ) : null}

            {isIosBrowser ? (
              <p className="text-[11px] text-text-dim leading-relaxed border-t border-white/10 pt-3 mt-1">
                <strong className="text-white">iPhone:</strong> en Safari usá Compartir → <strong className="text-white">Añadir a pantalla de inicio</strong> con esta web{' '}
                <span className="text-white break-all">({typeof window !== 'undefined' ? window.location.origin : ''})</span> para
                un acceso tipo app.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const ChannelCard = ({
  channel,
  onPlay,
  canDelete = false,
  onDelete,
}: {
  channel: any,
  onPlay: (ch: any) => void,
  canDelete?: boolean,
  onDelete?: (ch: any) => void
}) => {
  if (!channel) return null;
  const isPoster = channel.category === 'movies' || channel.category === 'series';
  const iosCompatible = isChannelIosCompatible(channel);
  
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={() => onPlay(channel)}
      className="group cursor-pointer"
    >
      <div className={`relative ${isPoster ? 'aspect-[2/3]' : 'aspect-video'} overflow-hidden rounded-[20px] mb-4 border border-white/5 group-hover:border-accent transition-all ring-accent/30 group-hover:ring-4 bg-surface shadow-2xl`}>
        <img 
          src={channel.thumbnailUrl || `https://picsum.photos/seed/${channel.name}/400/225`} 
          alt={channel.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md ${channel.tierRequired === 'premium' ? 'bg-accent text-bg' : 'bg-white/10 text-white border border-white/10'}`}>
             {channel.tierRequired}
           </span>
           {iosCompatible && (
             <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-success/20 text-success border border-success/40">
               Compatible iPhone
             </span>
           )}
           {canDelete && onDelete && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(channel);
               }}
               className="w-8 h-8 rounded-full bg-danger/80 text-white flex items-center justify-center hover:bg-danger transition-colors"
               title="Eliminar canal"
             >
               <Trash2 size={14} />
             </button>
           )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 bg-white text-bg rounded-full flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-transform duration-300">
            <Play size={28} fill="currentColor" />
          </div>
        </div>

        {!isPoster && (
          <div className="absolute bottom-4 left-4 right-4">
             <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)]" />
                <span className="text-[9px] font-black text-accent uppercase tracking-widest">En Directo</span>
             </div>
          </div>
        )}
      </div>
      <div className="px-1">
        <h3 className="text-white font-black text-[13px] mb-0.5 group-hover:text-accent transition-colors uppercase tracking-tighter truncate leading-tight">{channel.name}</h3>
        <p className="text-text-dim text-[9px] uppercase font-bold tracking-widest opacity-40 line-clamp-1 italic">
          {channel.currentProgram || channel.nowPlaying || channel.description || 'Premium Streaming Content'}
        </p>
      </div>
    </motion.div>
  );
};

const AIAsistant = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await geminiService.searchGrounding(query);
      setResult(res || 'No se encontró información.');
    } catch (error) {
      toast.error('Error al consultar a la IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Asistente Inteligente</h2>
        <p className="text-text-dim">Encuentra información actualizada sobre programación, deportes y más.</p>
      </div>

      <div className="glass-card p-8">
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pregunta sobre fútbol, series o noticias..."
              className="w-full bg-surface-light border border-surface-light rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-accent text-bg px-8 py-3.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Consultando...' : 'Preguntar'}
          </button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose prose-invert max-w-none bg-bg/50 p-6 rounded-xl border border-surface-light"
          >
            <p className="text-text-dim leading-relaxed whitespace-pre-wrap text-sm">{result}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface EpisodeEntry {
  season: number;
  episode: number;
  title: string;
  streamUrl: string;
  duration?: number;
  thumbnailUrl?: string;
}

const EpisodesEditor: React.FC<{
  episodes: EpisodeEntry[];
  onChange: (next: EpisodeEntry[]) => void;
}> = ({ episodes, onChange }) => {
  const [draft, setDraft] = useState<EpisodeEntry>({
    season: 1,
    episode: (episodes?.length || 0) + 1,
    title: '',
    streamUrl: '',
  });

  const addEpisode = () => {
    if (!draft.title.trim() || !draft.streamUrl.trim()) return;
    const next = [...(episodes || []), draft].sort(
      (a, b) => a.season - b.season || a.episode - b.episode
    );
    onChange(next);
    setDraft({
      season: draft.season,
      episode: draft.episode + 1,
      title: '',
      streamUrl: '',
    });
  };

  const removeEpisode = (idx: number) => {
    const next = episodes.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-black/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">
          Episodios ({episodes?.length || 0})
        </span>
      </div>
      {episodes?.length > 0 && (
        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
          {episodes.map((ep, idx) => (
            <div
              key={`${ep.season}-${ep.episode}-${idx}`}
              className="flex items-center justify-between gap-2 bg-surface-light px-3 py-2 rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-white truncate">
                  S{ep.season}E{ep.episode} · {ep.title}
                </p>
                <p className="text-[9px] text-text-dim truncate">{ep.streamUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => removeEpisode(idx)}
                className="text-text-dim hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="number"
          min={1}
          value={draft.season}
          onChange={(e) => setDraft({ ...draft, season: Number(e.target.value) || 1 })}
          placeholder="Temporada"
          className="bg-surface-light border border-surface-light rounded-lg p-2 text-white outline-none text-sm"
        />
        <input
          type="number"
          min={1}
          value={draft.episode}
          onChange={(e) => setDraft({ ...draft, episode: Number(e.target.value) || 1 })}
          placeholder="Episodio"
          className="bg-surface-light border border-surface-light rounded-lg p-2 text-white outline-none text-sm"
        />
      </div>
      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Título del episodio"
        className="w-full bg-surface-light border border-surface-light rounded-lg p-2 text-white outline-none text-sm mb-2"
      />
      <input
        type="text"
        value={draft.streamUrl}
        onChange={(e) => setDraft({ ...draft, streamUrl: e.target.value })}
        placeholder="URL del episodio (HLS / MP4)"
        className="w-full bg-surface-light border border-surface-light rounded-lg p-2 text-white outline-none text-sm mb-2"
      />
      <button
        type="button"
        onClick={addEpisode}
        className="w-full bg-white/10 hover:bg-accent hover:text-bg text-white py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all"
      >
        Añadir episodio
      </button>
    </div>
  );
};

const AdminPanel = ({ onClose, activeSection, onSectionChange, onInitChannels }: { onClose: () => void, activeSection: 'users' | 'channels' | 'plans', onSectionChange: (s: 'users' | 'channels' | 'plans') => void, onInitChannels: () => Promise<void> }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '', tier: 'free', role: 'user' });
  const [newChannel, setNewChannel] = useState<any>({
    name: '',
    description: '',
    currentProgram: '',
    streamUrl: '',
    thumbnailUrl: '',
    backdropUrl: '',
    tierRequired: 'free',
    category: 'news',
    mediaType: 'live',
    platforms: [],
    genres: [],
    runtime: 0,
    episodes: [],
  });
  const [importCountry, setImportCountry] = useState('ar');
  const [m3uText, setM3uText] = useState('');
  const [showM3uImport, setShowM3uImport] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [deviceLimits, setDeviceLimits] = useState({ maxDevicesUser: 3, maxDevicesAdmin: 999 });
  const filteredChannels = channels.filter((ch: any) => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(ch.name || '').toLowerCase().includes(q) ||
      String(ch.category || '').toLowerCase().includes(q) ||
      String(ch.tierRequired || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Users snapshot error:', err);
      toast.error('Error al cargar usuarios');
    });
    
    const unsubChannels = onSnapshot(collection(db, 'channels'), (snap) => {
      const channelList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((ch: any) => !ch.deleted);
      console.log('Admin channels updated:', channelList.length);
      setChannels(channelList);
    }, (err) => {
      console.error('Channels snapshot error:', err);
      toast.error('Error al cargar canales');
    });
    
    return () => { unsubUsers(); unsubChannels(); };
  }, []);

  useEffect(() => {
    const loadDeviceLimits = async () => {
      try {
        const limitsSnap = await getDoc(doc(db, 'settings', 'deviceLimits'));
        if (limitsSnap.exists()) {
          const data = limitsSnap.data() as any;
          setDeviceLimits({
            maxDevicesUser: Number(data.maxDevicesUser ?? 3),
            maxDevicesAdmin: Number(data.maxDevicesAdmin ?? 999),
          });
        }
      } catch (error) {
        console.error('Device limits load error:', error);
      }
    };
    loadDeviceLimits();
  }, []);

  const handleSaveDeviceLimits = async () => {
    try {
      const safeUserLimit = Math.max(1, Number(deviceLimits.maxDevicesUser || 3));
      const safeAdminLimit = Math.max(1, Number(deviceLimits.maxDevicesAdmin || 999));
      await setDoc(
        doc(db, 'settings', 'deviceLimits'),
        {
          maxDevicesUser: safeUserLimit,
          maxDevicesAdmin: safeAdminLimit,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setDeviceLimits({ maxDevicesUser: safeUserLimit, maxDevicesAdmin: safeAdminLimit });
      toast.success('Límites de dispositivos guardados');
    } catch (error) {
      toast.error('No se pudieron guardar los límites');
    }
  };

  const handleImportM3UText = async () => {
    if (!m3uText.trim()) return;
    try {
      const loadingToast = toast.loading('Procesando lista M3U manual...');
      const importedChannels = parseM3U(m3uText, 'Importado manualmente');
      const count = await upsertChannels(importedChannels, false);
      toast.dismiss(loadingToast);
      toast.success(`${count} canales importados correctamente`);
      setShowM3uImport(false);
      setM3uText('');
    } catch (error) {
      toast.dismiss();
      toast.error('Error al procesar la lista');
    }
  };

  const handleImportIPTV = async () => {
    try {
      const loadingToast = toast.loading(`Importando canales de ${importCountry.toUpperCase()}...`);
      const response = await fetch(`https://iptv-org.github.io/iptv/countries/${importCountry}.m3u`);
      if (!response.ok) throw new Error('Failed to fetch M3U');
      const text = await response.text();
      const importedChannels = parseM3U(text, 'Importado desde IPTV-org');
      const count = await upsertChannels(importedChannels, false);
      toast.dismiss(loadingToast);
      toast.success(`${count} canales importados correctamente`);
    } catch (error) {
      toast.dismiss();
      toast.error('Error al importar canales');
    }
  };

  const handleImportLegalSports = async () => {
    try {
      const loadingToast = toast.loading('Importando canales deportivos legales...');
      const parsed = JSON.parse(legalSportsChannelsRaw) as any[];
      const sanitized = parsed
        .filter((item) => item && item.name && (item.externalUrl || item.streamUrl))
        .map((item) => ({
          ...item,
          category: 'sports',
          tierRequired: item.tierRequired || 'free',
          deleted: false,
          docId: `${toSlug(item.name)}-${hashString(item.externalUrl || item.streamUrl || item.name)}`,
        }));

      const count = await upsertChannels(sanitized, false);
      toast.dismiss(loadingToast);
      toast.success(`${count} canales legales importados`);
    } catch (error) {
      toast.dismiss();
      toast.error('Error al importar legal-sports-channels.json');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        subscriptionTier: newUser.tier,
        role: newUser.role,
        subscriptionExpiry: expiryDate.toISOString(),
        activeDevices: [],
        createdAt: new Date().toISOString()
      });
      toast.success('Usuario creado exitosamente');
      setShowAddUser(false);
      setNewUser({ email: '', password: '', displayName: '', tier: 'free', role: 'user' });
    } catch (error: any) {
      toast.error('Error al crear usuario: ' + error.message);
    }
  };

  const handleUpdateUser = async (uid: string, data: any) => {
    try {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
      toast.success('Usuario actualizado');
    } catch (error) {
      toast.error('Error al actualizar usuario');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = newChannel.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'channels', id), newChannel);
      toast.success('Canal creado');
      setShowAddChannel(false);
      setNewChannel({
        name: '',
        description: '',
        currentProgram: '',
        streamUrl: '',
        thumbnailUrl: '',
        backdropUrl: '',
        tierRequired: 'free',
        category: 'news',
        mediaType: 'live',
        platforms: [],
        genres: [],
        runtime: 0,
        episodes: [],
      });
    } catch (error) {
      toast.error('Error al crear canal');
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'channels', editingChannel.id), editingChannel);
      toast.success('Canal actualizado');
      setEditingChannel(null);
    } catch (error) {
      toast.error('Error al actualizar canal');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este canal?')) {
      try {
        await setDoc(doc(db, 'channels', id), { deleted: true }, { merge: true }); // Using soft delete or just delete
        // For simplicity, let's just delete the doc if rules allow
        // await deleteDoc(doc(db, 'channels', id));
        toast.success('Canal eliminado (marcado como inactivo)');
      } catch (error) {
        toast.error('Error al eliminar canal');
      }
    }
  };

  const handleDiagnoseChannels = async () => {
    if (!window.electronAPI?.diagnoseStream) {
      toast.error('Diagnóstico avanzado disponible en la app de escritorio (Electron).');
      return;
    }

    const channelsToCheck = channels.filter(
      (ch: any) =>
        ch.externalUrl ||
        ch.streamUrl ||
        (Array.isArray(ch.streamAlternatives) && ch.streamAlternatives.length > 0)
    );
    if (!channelsToCheck.length) {
      toast.info('No hay canales con URLs para diagnosticar.');
      return;
    }

    const loadingToast = toast.loading(`Diagnosticando ${channelsToCheck.length} canales...`);
    let healthy = 0;
    let checked = 0;

    for (const ch of channelsToCheck) {
      const sourceList = Array.from(
        new Set([ch.externalUrl, ch.streamUrl, ...(ch.streamAlternatives || [])].filter(Boolean))
      );
      const result = await window.electronAPI.diagnoseStream(sourceList);
      if (result.ok) healthy += 1;
      checked += 1;

      const orderedSources = result.bestUrl
        ? [result.bestUrl, ...sourceList.filter((u: string) => u !== result.bestUrl)]
        : sourceList;

      await setDoc(
        doc(db, 'channels', ch.id),
        {
          streamUrl: orderedSources[0] || ch.streamUrl || '',
          streamAlternatives: orderedSources.slice(0, 5),
          health: {
            ok: result.ok,
            checkedAt: new Date().toISOString(),
            bestUrl: result.bestUrl,
            lastError: result.ok ? null : (result.attempts[result.attempts.length - 1]?.error || 'unavailable'),
            attempts: result.attempts.slice(0, 5),
          },
        },
        { merge: true }
      );

      toast.loading(`Diagnóstico: ${checked}/${channelsToCheck.length}`, { id: loadingToast });
    }

    toast.dismiss(loadingToast);
    toast.success(`Diagnóstico finalizado: ${healthy}/${channelsToCheck.length} canales operativos. Los que fallaron fueron ocultados.`);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-bg overflow-y-auto">
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter mb-2">PANEL DE CONTROL</h2>
            <p className="text-text-dim text-xs uppercase tracking-widest font-bold">Gestión Centralizada de StreamNexus</p>
          </div>
          <button onClick={onClose} className="bg-surface-light p-3 rounded-full hover:bg-surface transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button 
            onClick={() => onSectionChange('users')}
            className={`glass-card text-left transition-all ${activeSection === 'users' ? 'border-accent ring-1 ring-accent' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <User className={activeSection === 'users' ? 'text-accent' : 'text-text-dim'} size={24} />
              <h3 className="text-lg font-bold text-white">Usuarios</h3>
            </div>
            <p className="text-text-dim text-xs">Gestiona {users.length} cuentas activas.</p>
          </button>

          <button 
            onClick={() => onSectionChange('channels')}
            className={`glass-card text-left transition-all ${activeSection === 'channels' ? 'border-accent ring-1 ring-accent' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Tv className={activeSection === 'channels' ? 'text-accent' : 'text-text-dim'} size={24} />
              <h3 className="text-lg font-bold text-white">Canales</h3>
            </div>
            <p className="text-text-dim text-xs">Administra {channels.length} señales en vivo.</p>
          </button>

          <button 
            onClick={() => onSectionChange('plans')}
            className={`glass-card text-left transition-all ${activeSection === 'plans' ? 'border-accent ring-1 ring-accent' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Package className={activeSection === 'plans' ? 'text-accent' : 'text-text-dim'} size={24} />
              <h3 className="text-lg font-bold text-white">Planes</h3>
            </div>
            <p className="text-text-dim text-xs">Configura tarifas y beneficios.</p>
          </button>
        </div>

        <div className="glass-card p-0 overflow-hidden">
          {activeSection === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Lista de Usuarios</h3>
                <button 
                  onClick={() => setShowAddUser(true)}
                  className="bg-accent text-bg px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition-all"
                >
                  NUEVO USUARIO
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-light/50 text-[10px] uppercase font-bold tracking-widest text-text-dim">
                      <th className="p-6">Usuario</th>
                      <th className="p-6">Plan / Vencimiento</th>
                      <th className="p-6">Dispositivos</th>
                      <th className="p-6">Rol</th>
                      <th className="p-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-light">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
                              {u.email?.[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{u.displayName || 'Sin nombre'}</p>
                              <p className="text-[10px] text-text-dim">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <select 
                              value={u.subscriptionTier}
                              onChange={(e) => handleUpdateUser(u.id, { subscriptionTier: e.target.value })}
                              className="bg-surface-light border-none rounded text-xs font-bold text-white p-1 outline-none w-fit"
                            >
                              <option value="free">FREE</option>
                              <option value="basic">BASIC</option>
                              <option value="premium">PREMIUM</option>
                            </select>
                            <input 
                              type="date"
                              value={u.subscriptionExpiry ? u.subscriptionExpiry.split('T')[0] : ''}
                              onChange={(e) => handleUpdateUser(u.id, { subscriptionExpiry: new Date(e.target.value).toISOString() })}
                              className="bg-transparent text-[10px] text-text-dim outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${u.activeDevices?.length >= 3 ? 'text-danger' : 'text-accent'}`}>
                              {u.activeDevices?.length || 0}/3
                            </span>
                            <button 
                              onClick={() => handleUpdateUser(u.id, { activeDevices: [] })}
                              className="text-[8px] bg-surface-light px-2 py-1 rounded hover:bg-white/10 transition-all"
                            >
                              RESET
                            </button>
                          </div>
                        </td>
                        <td className="p-6">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                            className="bg-surface-light border-none rounded text-xs font-bold text-white p-1 outline-none"
                          >
                            <option value="user">USER</option>
                            <option value="admin">ADMIN</option>
                          </select>
                        </td>
                        <td className="p-6 text-right">
                          <button className="text-accent hover:underline text-xs font-bold">EDITAR</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeSection === 'channels' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Gestión de Canales</h3>
                  <p className="text-text-dim text-xs">Administra las señales y categorías.</p>
                </div>
                <div className="flex gap-3 items-center overflow-visible">
                  <button 
                    onClick={() => {
                      toast.loading('Refrescando datos...');
                      window.location.reload();
                    }}
                    className="bg-surface-light text-white p-2 rounded-lg hover:bg-surface transition-all"
                    title="Refrescar Panel"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('¿ESTÁS SEGURO? Se borrarán todos los canales permanentemente.')) {
                        try {
                          const loadingToast = toast.loading('Consultando base de datos...');
                          const snap = await getDocs(collection(db, 'channels'));
                          const count = snap.size;
                          
                          if (count === 0) {
                            toast.dismiss(loadingToast);
                            toast.info('No hay canales para eliminar');
                            return;
                          }

                          toast.loading(`Eliminando ${count} canales...`, { id: loadingToast });
                          
                          // Sequential batch deletion to avoid timeouts
                          const docs = snap.docs;
                          for (const d of docs) {
                            await deleteDoc(doc(db, 'channels', d.id));
                          }
                          
                          toast.dismiss(loadingToast);
                          toast.success('Base de datos vaciada correctamente');
                          setTimeout(() => window.location.reload(), 1000);
                        } catch (e: any) {
                          toast.error('Error al limpiar: ' + e.message);
                          console.error('Delete error:', e);
                        }
                      }
                    }}
                    className="bg-danger/10 text-danger px-4 py-2 rounded-lg font-bold text-[10px] hover:bg-danger/20 transition-all border border-danger/20 uppercase tracking-widest"
                  >
                    VACIAR BASE DE DATOS
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Cargar canales predeterminados (Pack Fútbol, Aire, Cine)?')) {
                        onInitChannels();
                      }
                    }}
                    className="bg-accent/20 text-accent px-4 py-2 rounded-lg font-bold text-xs hover:bg-accent/30 transition-all border border-accent/20"
                  >
                    CARGAR PACK AUTO
                  </button>
                  <button 
                    onClick={() => setShowM3uImport(true)}
                    className="bg-surface-light text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface transition-all"
                  >
                    PEGAR M3U
                  </button>
                  <button
                    onClick={handleImportLegalSports}
                    className="bg-surface-light text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface transition-all"
                  >
                    IMPORTAR SPORTS LEGAL
                  </button>
                  <div className="flex bg-surface-light rounded-lg overflow-hidden border border-white/10 relative z-50">
                    <select 
                      value={importCountry}
                      onChange={(e) => setImportCountry(e.target.value)}
                      className="bg-surface-light text-white px-3 py-2 text-xs font-bold outline-none border-r border-white/10 appearance-none cursor-pointer hover:bg-white/5 transition-all"
                      style={{ backgroundColor: '#1a1a1a', minWidth: '120px' }}
                    >
                      <option value="ar" style={{ backgroundColor: '#1a1a1a' }}>AR - Argentina</option>
                      <option value="es" style={{ backgroundColor: '#1a1a1a' }}>ES - España</option>
                      <option value="mx" style={{ backgroundColor: '#1a1a1a' }}>MX - México</option>
                      <option value="cl" style={{ backgroundColor: '#1a1a1a' }}>CL - Chile</option>
                      <option value="uy" style={{ backgroundColor: '#1a1a1a' }}>UY - Uruguay</option>
                      <option value="br" style={{ backgroundColor: '#1a1a1a' }}>BR - Brasil</option>
                      <option value="co" style={{ backgroundColor: '#1a1a1a' }}>CO - Colombia</option>
                      <option value="pe" style={{ backgroundColor: '#1a1a1a' }}>PE - Perú</option>
                      <option value="us" style={{ backgroundColor: '#1a1a1a' }}>US - Estados Unidos</option>
                      <option value="it" style={{ backgroundColor: '#1a1a1a' }}>IT - Italia</option>
                      <option value="fr" style={{ backgroundColor: '#1a1a1a' }}>FR - Francia</option>
                    </select>
                    <button 
                      onClick={handleImportIPTV}
                      className="text-accent px-4 py-2 font-bold text-xs hover:bg-white/5 transition-all"
                    >
                      IMPORTAR
                    </button>
                  </div>
                  <button 
                    onClick={onInitChannels}
                    className="bg-surface-light text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-surface transition-all"
                  >
                    RE-INICIALIZAR DB
                  </button>
                  <button 
                    onClick={handleDiagnoseChannels}
                    className="bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/20 transition-all border border-white/10"
                  >
                    DIAGNOSTICAR CANALES
                  </button>
                  <button 
                    onClick={() => setShowAddChannel(true)}
                    className="bg-accent text-bg px-4 py-2 rounded-lg font-bold text-xs hover:opacity-90 transition-all"
                  >
                    AGREGAR CANAL
                  </button>
                </div>
              </div>
              <div className="mb-5">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Buscar canal por nombre, categoría o plan..."
                    className="w-full bg-surface-light border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredChannels.map(ch => (
                  <div key={ch.id} className="bg-surface-light p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center">
                        <Tv size={20} className="text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{ch.name}</p>
                        <p className="text-[10px] text-text-dim uppercase tracking-widest">{ch.category} / {ch.tierRequired}</p>
                      </div>
                    </div>
                    <div className={`flex gap-2 transition-opacity ${channelSearch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button 
                        onClick={() => setEditingChannel(ch)}
                        className="text-text-dim hover:text-white transition-colors"
                        title="Editar canal"
                      >
                        <Settings size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="text-text-dim hover:text-danger transition-colors"
                        title="Borrar canal"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredChannels.length === 0 && (
                <p className="text-text-dim text-xs mt-4">No se encontraron canales con ese criterio.</p>
              )}
            </div>
          )}
          {activeSection === 'plans' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Planes de Suscripción</h3>
              <div className="bg-surface-light p-6 rounded-2xl border border-white/5 mb-6">
                <h4 className="text-white font-black text-lg mb-4">Límite de Dispositivos</h4>
                <p className="text-text-dim text-xs mb-5">Configura cuántos dispositivos simultáneos puede usar cada rol.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Usuarios normales</label>
                    <input
                      type="number"
                      min={1}
                      value={deviceLimits.maxDevicesUser}
                      onChange={(e) => setDeviceLimits((prev) => ({ ...prev, maxDevicesUser: Number(e.target.value) }))}
                      className="w-full bg-bg border border-surface rounded-lg p-3 text-white outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Administradores</label>
                    <input
                      type="number"
                      min={1}
                      value={deviceLimits.maxDevicesAdmin}
                      onChange={(e) => setDeviceLimits((prev) => ({ ...prev, maxDevicesAdmin: Number(e.target.value) }))}
                      className="w-full bg-bg border border-surface rounded-lg p-3 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveDeviceLimits}
                  className="bg-accent text-bg px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Guardar límites
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['FREE', 'BASIC', 'PREMIUM'].map(tier => (
                  <div key={tier} className="bg-surface-light p-6 rounded-2xl border border-white/5">
                    <h4 className="text-accent font-black text-2xl mb-2">{tier}</h4>
                    <p className="text-text-dim text-xs mb-6">Configuración de beneficios para el nivel {tier}.</p>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-xs text-white/80">
                        <Shield size={14} className="text-accent" /> Canales de Aire
                      </li>
                      {tier !== 'FREE' && (
                        <li className="flex items-center gap-2 text-xs text-white/80">
                          <Shield size={14} className="text-accent" /> Canales de Cine
                        </li>
                      )}
                      {tier === 'PREMIUM' && (
                        <li className="flex items-center gap-2 text-xs text-white/80">
                          <Shield size={14} className="text-accent" /> Pack Fútbol Full
                        </li>
                      )}
                    </ul>
                    <button className="w-full py-3 bg-white/5 rounded-xl text-white text-xs font-bold hover:bg-white/10 transition-all">
                      EDITAR PLAN
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showM3uImport && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-8 relative"
            >
              <button onClick={() => setShowM3uImport(false)} className="absolute top-4 right-4 text-text-dim hover:text-white">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">IMPORTAR LISTA M3U</h2>
              <p className="text-text-dim text-xs mb-6 uppercase tracking-widest">Pega el contenido de tu archivo .m3u abajo</p>
              
              <textarea 
                value={m3uText}
                onChange={(e) => setM3uText(e.target.value)}
                placeholder="#EXTM3U\n#EXTINF:-1,Canal Ejemplo\nhttp://..."
                className="w-full h-64 bg-surface-light border border-surface-light rounded-2xl p-4 text-white font-mono text-xs outline-none focus:border-accent transition-all mb-6"
              />
              
              <div className="flex gap-4">
                <button 
                  onClick={handleImportM3UText}
                  className="flex-1 bg-accent text-bg py-4 rounded-2xl font-bold hover:opacity-90 transition-all uppercase text-xs tracking-widest"
                >
                  PROCESAR E IMPORTAR
                </button>
                <button 
                  onClick={() => setShowM3uImport(false)}
                  className="flex-1 bg-surface-light text-white py-4 rounded-2xl font-bold hover:bg-surface transition-all uppercase text-xs tracking-widest"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddUser && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full p-8 relative"
            >
              <button onClick={() => setShowAddUser(false)} className="absolute top-4 right-4 text-text-dim hover:text-white">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-white mb-6 tracking-tighter">NUEVO USUARIO</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Email</label>
                  <input 
                    type="email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Contraseña Temporal</label>
                  <input 
                    type="password" 
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Plan</label>
                    <select 
                      value={newUser.tier}
                      onChange={(e) => setNewUser({...newUser, tier: e.target.value})}
                      className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                    >
                      <option value="free">FREE</option>
                      <option value="basic">BASIC</option>
                      <option value="premium">PREMIUM</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Rol</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                    >
                      <option value="user">USER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full mt-4 bg-accent text-bg py-4 rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  CREAR CUENTA
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {(showAddChannel || editingChannel) && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full p-8 relative"
            >
              <button onClick={() => { setShowAddChannel(false); setEditingChannel(null); }} className="absolute top-4 right-4 text-text-dim hover:text-white">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-white mb-6 tracking-tighter">
                {editingChannel ? 'EDITAR CANAL' : 'NUEVO CANAL'}
              </h2>
              <form onSubmit={editingChannel ? handleUpdateChannel : handleCreateChannel} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Nombre del Canal</label>
                  <input 
                    type="text" 
                    value={editingChannel ? editingChannel.name : newChannel.name}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, name: e.target.value}) : setNewChannel({...newChannel, name: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Descripción</label>
                  <input 
                    type="text" 
                    value={editingChannel ? editingChannel.description : newChannel.description}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, description: e.target.value}) : setNewChannel({...newChannel, description: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">En emisión ahora</label>
                  <input
                    type="text"
                    value={(editingChannel ? editingChannel.currentProgram : newChannel.currentProgram) || ''}
                    onChange={(e) =>
                      editingChannel
                        ? setEditingChannel({ ...editingChannel, currentProgram: e.target.value })
                        : setNewChannel({ ...newChannel, currentProgram: e.target.value })
                    }
                    placeholder="Ej: El Cantando"
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">URL de Streaming (M3U8)</label>
                  <input 
                    type="text" 
                    value={editingChannel ? editingChannel.streamUrl : newChannel.streamUrl}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, streamUrl: e.target.value}) : setNewChannel({...newChannel, streamUrl: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">URL de Miniatura</label>
                  <input 
                    type="text" 
                    value={editingChannel ? editingChannel.thumbnailUrl : newChannel.thumbnailUrl}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, thumbnailUrl: e.target.value}) : setNewChannel({...newChannel, thumbnailUrl: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Categoría</label>
                  <select 
                    value={editingChannel ? editingChannel.category : newChannel.category}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, category: e.target.value}) : setNewChannel({...newChannel, category: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                  >
                    <option value="news">NOTICIAS / AIRE</option>
                    <option value="sports">DEPORTES / PACK FÚTBOL</option>
                    <option value="streaming">STREAMING</option>
                    <option value="apps">APLICACIONES</option>
                    <option value="movies">CINE Y SERIES</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Plan Requerido</label>
                  <select 
                    value={editingChannel ? editingChannel.tierRequired : newChannel.tierRequired}
                    onChange={(e) => editingChannel ? setEditingChannel({...editingChannel, tierRequired: e.target.value}) : setNewChannel({...newChannel, tierRequired: e.target.value})}
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                  >
                    <option value="free">FREE</option>
                    <option value="basic">BASIC</option>
                    <option value="premium">PREMIUM</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Tipo de contenido</label>
                  <select
                    value={(editingChannel ? editingChannel.mediaType : newChannel.mediaType) || 'live'}
                    onChange={(e) =>
                      editingChannel
                        ? setEditingChannel({ ...editingChannel, mediaType: e.target.value })
                        : setNewChannel({ ...newChannel, mediaType: e.target.value })
                    }
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                  >
                    <option value="live">EN VIVO (Canal)</option>
                    <option value="movie">PELÍCULA</option>
                    <option value="series">SERIE</option>
                  </select>
                </div>

                {((editingChannel ? editingChannel.mediaType : newChannel.mediaType) === 'movie') && (
                  <div>
                    <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Duración (segundos)</label>
                    <input
                      type="number"
                      min={0}
                      value={(editingChannel ? editingChannel.runtime : newChannel.runtime) || 0}
                      onChange={(e) =>
                        editingChannel
                          ? setEditingChannel({ ...editingChannel, runtime: Number(e.target.value) || 0 })
                          : setNewChannel({ ...newChannel, runtime: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-2 block">Hubs / Plataformas</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {BRANDS.map((b) => {
                      const current: string[] = (editingChannel ? editingChannel.platforms : newChannel.platforms) || [];
                      const selected = current.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? current.filter((p) => p !== b.id)
                              : [...current, b.id];
                            if (editingChannel) {
                              setEditingChannel({ ...editingChannel, platforms: next });
                            } else {
                              setNewChannel({ ...newChannel, platforms: next });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                            selected
                              ? 'bg-accent text-bg border-accent'
                              : 'bg-surface-light text-text-dim border-white/10 hover:text-white'
                          }`}
                        >
                          {b.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-2 block">Géneros</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {GENRE_OPTIONS.map((g) => {
                      const current: string[] = (editingChannel ? editingChannel.genres : newChannel.genres) || [];
                      const selected = current.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? current.filter((p) => p !== g.id)
                              : [...current, g.id];
                            if (editingChannel) {
                              setEditingChannel({ ...editingChannel, genres: next });
                            } else {
                              setNewChannel({ ...newChannel, genres: next });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                            selected
                              ? 'bg-white text-bg border-white'
                              : 'bg-surface-light text-text-dim border-white/10 hover:text-white'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase mb-1 block">Imagen de fondo (Backdrop)</label>
                  <input
                    type="text"
                    value={(editingChannel ? editingChannel.backdropUrl : newChannel.backdropUrl) || ''}
                    onChange={(e) =>
                      editingChannel
                        ? setEditingChannel({ ...editingChannel, backdropUrl: e.target.value })
                        : setNewChannel({ ...newChannel, backdropUrl: e.target.value })
                    }
                    placeholder="URL para el hero del hub (opcional)"
                    className="w-full bg-surface-light border border-surface-light rounded-lg p-3 text-white outline-none"
                  />
                </div>

                {((editingChannel ? editingChannel.mediaType : newChannel.mediaType) === 'series') && (
                  <EpisodesEditor
                    episodes={
                      (editingChannel ? editingChannel.episodes : newChannel.episodes) || []
                    }
                    onChange={(eps) =>
                      editingChannel
                        ? setEditingChannel({ ...editingChannel, episodes: eps })
                        : setNewChannel({ ...newChannel, episodes: eps })
                    }
                  />
                )}

                <button 
                  type="submit"
                  className="w-full mt-4 bg-accent text-bg py-4 rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  {editingChannel ? 'GUARDAR CAMBIOS' : 'CREAR CANAL'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const ExternalPlatformPlayer = ({ url, onClose }: { url: string, onClose: () => void }) => {
  let hostLabel = 'App';
  try {
    hostLabel = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[160] bg-black flex flex-col"
    >
      <div className="h-[60px] bg-surface/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
            <LayoutDashboard size={16} className="text-bg" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[10px] font-black text-white tracking-widest uppercase truncate">{hostLabel}</h2>
            <p className="text-[8px] text-accent font-bold uppercase tracking-widest">Dentro de StreamNexus</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white/10 hover:bg-danger hover:text-white rounded-full flex items-center justify-center transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-black/60 border-b border-white/5 text-[10px] text-text-dim text-center leading-snug">
        Reproducción dentro de StreamNexus.
      </div>
      
      <div className="flex-1 relative bg-surface min-h-0">
        <iframe 
          key={url}
          src={url} 
          className="w-full h-full border-none"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          title="App Player"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </motion.div>
  );
};

const Sidebar = ({ onOpenPlatform }: { onOpenPlatform: (url: string) => void }) => (
  <aside className="sidebar">
    <div className="glass-card">
      <span className="text-[10px] uppercase font-bold tracking-widest text-text-dim mb-4 block">Accesos Rápidos</span>
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center gap-2 bg-surface-light p-3 rounded-lg hover:bg-surface transition-colors text-xs font-bold" onClick={() => onOpenPlatform('https://www.disneyplus.com')}>
          <div className="w-4 h-4 bg-[#0063E5] rounded-sm" /> Disney+
        </button>
        <button className="flex items-center gap-2 bg-surface-light p-3 rounded-lg hover:bg-surface transition-colors text-xs font-bold" onClick={() => onOpenPlatform('https://www.starplus.com')}>
          <div className="w-4 h-4 bg-[#00A8E1] rounded-sm" /> Star+
        </button>
      </div>
    </div>
  </aside>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [liveTvCategory, setLiveTvCategory] = useState<'all' | ChannelCategory>('all');
  const [tvOnlyCompatible, setTvOnlyCompatible] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [selectedInitialPosition, setSelectedInitialPosition] = useState<number>(0);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSection, setAdminSection] = useState<'users' | 'channels' | 'plans'>('users');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState<BrandMeta | null>(null);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const { profile, loading, isAuthReady, user } = useAuth();
  const isAdminUser = profile?.role === 'admin' || (user?.email || '').toLowerCase() === 's.vicens.1160@gmail.com';
  const dynamicApps = channels.filter((c: any) => c.category === 'apps' && Boolean(c.externalUrl));
  const excludedMovieNames = new Set(['pluto tv cine', 'plex películas', 'plex peliculas']);
  const moviesForDisplay = channels.filter(
    (c: any) => c.category === 'movies' && !excludedMovieNames.has(String(c.name || '').toLowerCase())
  );

  const channelZapList = useMemo(() => {
    const withStream = channels.filter((c: any) => Boolean(c.streamUrl));
    if (activeTab === 'channels' && liveTvCategory !== 'all') {
      return withStream.filter((c: any) => c.category === liveTvCategory);
    }
    return withStream;
  }, [channels, activeTab, liveTvCategory]);

  const handleZapChannel = useCallback((ch: any) => {
    if (!ch?.streamUrl) return;
    setSelectedChannel(ch);
  }, []);

  const liveTvCategoryCounts = useMemo(() => {
    const base = tvOnlyCompatible ? channels.filter((c: any) => isChannelTvCompatible(c)) : channels;
    const withStream = base.filter((c: any) => Boolean(c.streamUrl));
    const counts: Partial<Record<ChannelCategory, number>> = {};
    for (const c of withStream) {
      const cat = c.category as ChannelCategory;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [channels, tvOnlyCompatible]);

  const channelsForTvTab = useMemo(
    () => (tvOnlyCompatible ? channels.filter((c: any) => isChannelTvCompatible(c)) : channels),
    [channels, tvOnlyCompatible]
  );

  useEffect(() => {
    if (!user?.uid) {
      setProgressRecords([]);
      return;
    }
    const unsub = subscribeContinueWatching(user.uid, (records) => {
      setProgressRecords(records);
    });
    return () => unsub();
  }, [user?.uid]);

  const progressByItemId = useMemo(() => {
    const map: Record<string, ProgressRecord> = {};
    for (const r of progressRecords) {
      const key = r.itemId;
      if (!map[key] || (map[key].updatedAt || 0) < (r.updatedAt || 0)) {
        map[key] = r;
      }
    }
    return map;
  }, [progressRecords]);

  const continueWatchingItems = useMemo(() => {
    const byId = new Map(channels.map((c: any) => [c.id, c]));
    return progressRecords
      .map((r) => byId.get(r.itemId))
      .filter(Boolean) as any[];
  }, [progressRecords, channels]);

  const isProtectedTab = (tab: string) => tab !== 'home';

  const handleTabChange = (tab: string) => {
    if (isProtectedTab(tab) && !user) {
      toast.error('Debes iniciar sesión para usar esta sección.');
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const openExternalPlatform = async (url: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para abrir este contenido.');
      setIsAuthModalOpen(true);
      return;
    }
    if (Capacitor.isNativePlatform()) {
      toast.error('Canal no disponible');
      return;
    }
    const normalized = normalizeExternalPlayerUrl(url);
    setExternalUrl(normalized);
  };

  const handlePlayChannel = async (channel: any) => {
    if (!channel) return;
    const alternatives = Array.isArray(channel.streamAlternatives)
      ? channel.streamAlternatives.filter(Boolean)
      : [];
    const bestAlt =
      alternatives.find((u: string) => String(u).startsWith('https://')) ||
      alternatives[0] ||
      '';
    const playableChannel = {
      ...channel,
      streamUrl: channel.streamUrl || bestAlt,
      streamAlternatives: alternatives,
    };

    if (playableChannel.externalUrl && !playableChannel.streamUrl) {
      if (Capacitor.isNativePlatform()) {
        toast.error('Canal no disponible');
        return;
      }
      openExternalPlatform(playableChannel.externalUrl);
      return;
    }
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    // Check subscription expiry
    if (profile?.subscriptionExpiry) {
      const expiry = new Date(profile.subscriptionExpiry);
      if (expiry < new Date()) {
        toast.error('Tu suscripción ha vencido. Por favor, renueva tu plan.');
        return;
      }
    }

    const tiers = { free: 0, basic: 1, premium: 2 };
    const userTier = profile?.subscriptionTier || 'free';
    
    if (tiers[userTier] < tiers[playableChannel.tierRequired as keyof typeof tiers]) {
      toast.error(`Este canal requiere suscripción ${playableChannel.tierRequired.toUpperCase()}`);
      return;
    }

    let resumePos = 0;
    const isLiveCh =
      playableChannel.mediaType === 'live' || (!playableChannel.mediaType && !playableChannel.runtime);
    if (!isLiveCh && user?.uid && playableChannel?.id) {
      try {
        const rec = await getItemProgress(user.uid, playableChannel.id);
        if (rec && rec.percent < 0.95 && rec.position > 5) {
          resumePos = rec.position;
        }
      } catch {
        /* ignore */
      }
    }
    setSelectedInitialPosition(resumePos);
    setSelectedChannel(playableChannel);
  };

  const handleOpenOfficialApp = useCallback(
    (brand: BrandMeta) => {
      openExternalPlatform(brand.webUrl);
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [user]
  );

  const handleDeleteLiveChannel = async (channel: any) => {
    if (!isAdminUser) return;
    if (!channel?.id) return;
    if (!window.confirm(`¿Eliminar el canal "${channel.name}"?`)) return;
    try {
      await setDoc(doc(db, 'channels', channel.id), { deleted: true }, { merge: true });
      toast.success('Canal eliminado');
    } catch (error: any) {
      try {
        await deleteDoc(doc(db, 'channels', channel.id));
        toast.success('Canal eliminado');
      } catch {
        toast.error(`No se pudo eliminar el canal: ${error?.message || 'permiso denegado'}`);
      }
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) {
      setChannels([]);
      return;
    }

    // Listener para los canales
    const q = collection(db, 'channels');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((ch: any) => {
          if (ch.deleted) return false;
          if (!Boolean(ch.streamUrl || ch.externalUrl)) return false;
          if (ch.health && ch.health.ok === false && !Capacitor.isNativePlatform()) {
            const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.getAppMeta);
            if (!isElectron) return false;
          }
          return true;
        })
        .filter((ch: any) => {
          if (!isIosWeb()) return true;
          if (ch.externalUrl) return true;
          const streamCandidates = [ch.streamUrl, ...(ch.streamAlternatives || [])]
            .filter(Boolean)
            .map(String);
          return streamCandidates.some(isLikelyIosPlayableStream);
        })
        .map(normalizeChannelForAppsSection)
        .map((ch: any) => {
          const alternatives = Array.isArray(ch.streamAlternatives)
            ? ch.streamAlternatives.filter(Boolean)
            : [];
          const bestAlt =
            alternatives.find((u: string) => String(u).startsWith('https://')) ||
            alternatives[0] ||
            '';
          return cleanChannelRecord({
            ...ch,
            streamUrl: ch.streamUrl || bestAlt,
            streamAlternatives: alternatives,
          });
        });
      setChannels(channelList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels');
    });

    return () => unsubscribe();
  }, [isAuthReady, user, profile?.role]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getAppMeta) return;
    api
      .getAppMeta()
      .then((m) => {
        if (!m.autoUpdateConfigured) {
          const k = 'streamnexus-update-hint-v1';
          if (!sessionStorage.getItem(k)) {
            sessionStorage.setItem(k, '1');
            toast.message('Cómo actualizar StreamNexus', {
              description:
                'Sin servidor de actualizaciones HTTPS no se puede parchear solo. Instalá el Setup .exe nuevo cuando publique una versión. En el móvil usá la web (npm run dev o hosting) con la IP de tu PC en la misma Wi‑Fi.',
              duration: 14000,
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.subscribeUpdater) return;
    const unsub = api.subscribeUpdater((evt) => {
      if (evt.kind === 'available' && evt.version) {
        toast.message('Actualización disponible', { description: `Versión ${evt.version}. Se descarga en segundo plano…` });
      }
      if (evt.kind === 'progress' && typeof evt.percent === 'number') {
        const p = Math.round(evt.percent);
        if (p > 2 && p < 99) {
          toast.loading(`Descargando actualización… ${p}%`, { id: 'streamnexus-updater' });
        }
      }
      if (evt.kind === 'downloaded') {
        toast.dismiss('streamnexus-updater');
        toast.success('Actualización lista', {
          description: evt.version ? `Versión ${evt.version}. Reiniciá cuando quieras (también verás un aviso del sistema).` : 'Reiniciá la app para aplicarla.',
        });
      }
    });
    return () => {
      unsub();
    };
  }, []);

  // Función para inicializar canales con señales reales
  const initChannels = async () => {
    try {
      const loadingToast = toast.loading('Reinicializando base de datos desde playlist.m3u...');
      const autoPackChannels = parseM3U(autoPackM3U, 'Pack Auto');
      const defaults = [
        ...DEFAULT_APPS_CHANNELS,
        ...DEFAULT_ARGENTINA_LIVE_CHANNELS,
        ...DEFAULT_STREAMING_CHANNELS,
        ...DEFAULT_SPORTS_CHANNELS,
        ...DEFAULT_FOOTBALL_PACK_CHANNELS,
      ].map((item) => ({
        ...item,
        docId: `${toSlug(item.name)}-${hashString(item.externalUrl || item.name)}`,
      }));
      const count = await upsertChannels([...autoPackChannels, ...defaults], true);
      toast.dismiss(loadingToast);
      toast.success(`Base reinicializada correctamente (${count} canales cargados)`);
    } catch (error) {
      toast.dismiss();
      handleFirestoreError(error, OperationType.WRITE, 'channels');
      toast.error('No se pudo reinicializar la base de datos');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-bg flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-8 h-16 bg-accent rounded-sm" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans selection:bg-accent selection:text-bg">
      <Toaster position="top-center" richColors />
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} onLoginClick={() => setIsAuthModalOpen(true)} />
      
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        )}
        {selectedChannel && (
          <VideoPlayer 
            src={selectedChannel.streamUrl} 
            sources={selectedChannel.streamAlternatives ?? EMPTY_STREAM_SOURCES}
            onClose={() => setSelectedChannel(null)}
            zapChannels={channelZapList}
            zapCurrentId={selectedChannel.id}
            onZapChannel={handleZapChannel}
            channelLabel={selectedChannel.name}
            itemId={selectedChannel.id}
            initialPosition={selectedInitialPosition}
            uid={user?.uid}
            thumbnailUrl={selectedChannel.thumbnailUrl}
            isLive={
              selectedChannel.mediaType === 'live' ||
              (!selectedChannel.mediaType && !selectedChannel.runtime)
            }
          />
        )}
        {activeBrand && (
          <BrandHub
            brand={activeBrand}
            items={channels}
            progressByItemId={progressByItemId}
            onPlay={(item) => {
              const ch = channels.find((c: any) => c.id === item.id) || item;
              handlePlayChannel(ch);
            }}
            onClose={() => setActiveBrand(null)}
            onOpenOfficial={handleOpenOfficialApp}
          />
        )}
        {externalUrl && (
          <ExternalPlatformPlayer 
            url={externalUrl} 
            onClose={() => setExternalUrl(null)} 
          />
        )}
        {showAdminPanel && (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            activeSection={adminSection}
            onSectionChange={setAdminSection}
            onInitChannels={initChannels}
          />
        )}
      </AnimatePresence>

      <main className="pt-[calc(76px+env(safe-area-inset-top,0px))]">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HomeRows
                items={channels}
                progressByItemId={progressByItemId}
                continueWatching={continueWatchingItems}
                onPlay={handlePlayChannel}
                onOpenBrand={(b) => setActiveBrand(b)}
                onOpenSection={handleTabChange}
              />
              <div className="mt-12 space-y-10 border-t border-white/5 pt-10 pb-24">
                <InstallStreamNexusSection />
                <AppUpdatePanel
                  fallbackApkUrl={PUBLIC_GITHUB_TV_APK_LATEST}
                  releasesUrl={PUBLIC_GITHUB_RELEASES_LATEST}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'channels' && (
            <motion.div 
              key="channels"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChannelsBrowser
                items={channelsForTvTab}
                progressByItemId={progressByItemId}
                onPlay={handlePlayChannel}
                canDelete={isAdminUser}
                onDelete={handleDeleteLiveChannel}
                tvOnlyToggle={{
                  value: tvOnlyCompatible,
                  onChange: (v) => setTvOnlyCompatible(v),
                }}
              />
            </motion.div>
          )}

          {activeTab === 'platforms' && (
            <motion.div 
              key="platforms"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 lg:px-12 py-12"
            >
              <h2 className="text-3xl lg:text-5xl font-black tracking-tighter italic uppercase mb-3">Hubs</h2>
              <p className="text-text-dim text-sm mb-10 max-w-2xl">
                Accesos ordenados dentro de StreamNexus. La música ahora se reproduce dentro de la app,
                sin abrir Spotify, YouTube ni otras plataformas externas.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('music')}
                  className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 hover:border-white/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent transition-all shadow-2xl text-left group"
                  style={{ background: 'linear-gradient(135deg, #00F0FF 0%, #101827 100%)' }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-end p-5">
                    <div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-3 bg-accent text-bg font-black">
                        M
                      </div>
                      <h3 className="text-2xl font-black tracking-tighter text-white">
                        Música
                      </h3>
                      <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-1">
                        Reproductor interno
                      </p>
                    </div>
                  </div>
                </button>
                {BRANDS.map((b) => {
                  const count = channels.filter((c: any) =>
                    Array.isArray(c.platforms) && c.platforms.includes(b.id)
                  ).length;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveBrand(b)}
                      className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 hover:border-white/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent transition-all shadow-2xl text-left group"
                      style={{ background: b.gradient }}
                    >
                      <img
                        src={b.backdropUrl}
                        alt={b.label}
                        className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-end p-5">
                        <div>
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-3"
                            style={{ backgroundColor: b.color }}
                          >
                            <span className="text-white font-black text-xl">
                              {b.shortLabel[0]}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black tracking-tighter text-white">
                            {b.label}
                          </h3>
                          <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-1">
                            {count > 0 ? `${count} en tu catálogo` : 'Hub interno'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {dynamicApps.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-xl font-black tracking-tighter italic uppercase mb-5">
                    Otros accesos
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {dynamicApps.map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => openExternalPlatform(app.externalUrl)}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-surface-light hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all shadow-2xl text-left"
                        style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, #000 100%)' }}
                      >
                        <img
                          src={app.thumbnailUrl}
                          alt={app.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-40"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                          <h4 className="text-sm font-black tracking-tighter">{app.name}</h4>
                          <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">
                            Abrir
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'music' && (
            <motion.div
              key="music"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MusicPlayer />
            </motion.div>
          )}

          {activeTab === 'movies' && (
            <motion.div 
              key="movies"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChannelsBrowser
                items={channels.filter(
                  (c: any) =>
                    c.mediaType === 'movie' ||
                    (!c.mediaType && c.category === 'movies' &&
                      !excludedMovieNames.has(String(c.name || '').toLowerCase()))
                )}
                progressByItemId={progressByItemId}
                onPlay={handlePlayChannel}
                canDelete={isAdminUser}
                onDelete={handleDeleteLiveChannel}
              />
            </motion.div>
          )}

          {activeTab === 'series' && (
            <motion.div 
              key="series"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChannelsBrowser
                items={channels.filter(
                  (c: any) =>
                    c.mediaType === 'series' || (!c.mediaType && c.category === 'series')
                )}
                progressByItemId={progressByItemId}
                onPlay={handlePlayChannel}
                canDelete={isAdminUser}
                onDelete={handleDeleteLiveChannel}
              />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AIAsistant />
            </motion.div>
          )}

          {activeTab === 'admin' && isAdminUser && (
            <AdminPanel 
              onClose={() => setActiveTab('home')} 
              activeSection={adminSection}
              onSectionChange={setAdminSection}
              onInitChannels={initChannels}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-surface-light py-10 px-12 mt-10 bg-surface">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-accent rounded-sm" />
            <span className="text-lg font-extrabold tracking-tighter">STREAMNEXUS</span>
          </div>
          <div className="flex gap-8 text-xs font-bold text-text-dim uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] text-text-dim uppercase font-bold tracking-widest">Tu Plan:</span>
             <div className="accent-pill">PACK PREMIUM FULL</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
