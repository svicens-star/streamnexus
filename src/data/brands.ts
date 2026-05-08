export interface BrandMeta {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  gradient: string;
  textColor: string;
  posterUrl: string;
  backdropUrl: string;
  packageNames: string[];
  webUrl: string;
  storeUrl: string;
  blurb: string;
}

export const BRANDS: BrandMeta[] = [
  {
    id: 'disneyPlus',
    label: 'Disney+',
    shortLabel: 'DISNEY+',
    color: '#0063E5',
    gradient: 'linear-gradient(135deg, #0063E5 0%, #050a1f 100%)',
    textColor: '#FFFFFF',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/512px-Disney%2B_logo.svg.png',
    backdropUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1600',
    packageNames: ['com.disney.disneyplus'],
    webUrl: 'https://www.disneyplus.com',
    storeUrl: 'market://details?id=com.disney.disneyplus',
    blurb: 'Disney, Marvel, Star Wars, Pixar',
  },
  {
    id: 'starPlus',
    label: 'Star+',
    shortLabel: 'STAR+',
    color: '#1B0E40',
    gradient: 'linear-gradient(135deg, #4d1eb6 0%, #0c0524 100%)',
    textColor: '#FFFFFF',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Star%2B_logo.svg/512px-Star%2B_logo.svg.png',
    backdropUrl: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=1600',
    packageNames: ['com.disney.starplus'],
    webUrl: 'https://www.starplus.com',
    storeUrl: 'market://details?id=com.disney.starplus',
    blurb: 'Series, deportes y entretenimiento',
  },
];

export const getBrand = (id: string): BrandMeta | undefined =>
  BRANDS.find((b) => b.id === id);

export const GENRE_LABELS: Record<string, string> = {
  accion: 'Acción',
  aventura: 'Aventura',
  drama: 'Drama',
  comedia: 'Comedia',
  romance: 'Romance',
  terror: 'Terror',
  suspenso: 'Suspenso',
  ciencia_ficcion: 'Ciencia Ficción',
  fantasia: 'Fantasía',
  documental: 'Documental',
  animacion: 'Animación',
  infantil: 'Infantil',
  anime: 'Anime',
  musical: 'Musical',
  deportes: 'Deportes',
  reality: 'Reality',
  historico: 'Histórico',
  crimen: 'Crimen',
};

export const GENRE_OPTIONS = Object.entries(GENRE_LABELS).map(([id, label]) => ({
  id,
  label,
}));

export const genreLabel = (id: string): string =>
  GENRE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1);
