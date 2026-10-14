/**
 * The songs on the DAC on her desk (About). Each plays in full through the YouTube IFrame player,
 * which only loads when someone presses play.
 *
 * CONTOH — ganti dengan lagu asli: Adelia will send her own YouTube links. Until then one song
 * holds the place: Kenshi Yonezu's "Umi no Yuurei" (Spirits of the Sea), the official MV from his
 * channel. To add a song, copy an entry and paste the id from the YouTube URL (the part after `v=`).
 *
 * Some labels don't let their songs play inside other sites. YouTube then reports error 101 or 150,
 * and the DAC shows "YouTube only" with a link out instead of a broken player. To check a song
 * before adding it, open https://www.youtube.com/embed/<id> in a normal browser and see whether it
 * plays.
 */

export type Song = {
  id: string;
  title: string;
  /** The title as written in its own language, when it differs. */
  original?: string;
  artist: string;
  youtubeId: string;
};

export const playlist: Song[] = [
  {
    id: "umi-no-yuurei",
    title: "Umi no Yuurei (Spirits of the Sea)",
    original: "海の幽霊",
    artist: "Kenshi Yonezu",
    youtubeId: "1s84rIhPuhk",
  },
];
