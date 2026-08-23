// Every photograph on the site, with the attribution its licence requires.
//
// All three are Creative Commons BY, which permits commercial use but obliges
// us to name the author, link the source and name the licence — that is what
// /credits renders. Removing a photo from the app means removing it here too,
// so the credits page can never drift out of sync with what is displayed.
//
// Only rights-clean, context photography is used: streets, traffic, vehicles.
// Photographs where a person is the identifiable subject are deliberately
// excluded — a CC licence covers copyright, not the personality rights of the
// people pictured, and using their likeness to promote a commercial service
// would imply an endorsement they never gave. The people-centred moments use
// the drawn scenes in components/illustrations instead.

export interface Photo {
  /** Base name under /public/images, without extension. */
  file: string;
  alt: string;
  title: string;
  author: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
}

export const PHOTOS = {
  dakarTraffic: {
    file: "dakar-circulation",
    alt: "Circulation à Dakar : un car rapide, des taxis jaunes et des voitures à un carrefour",
    title: "Dakar Traffic Circle",
    author: "CMoravec",
    sourceUrl: "https://www.flickr.com/photos/27837490800",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  dakarStation: {
    file: "dakar-gare-routiere",
    alt: "Gare routière de Dakar vue d'en haut, avec ses minibus de transport en commun",
    title: "transport",
    author: "Jeff Attaway",
    sourceUrl: "https://www.flickr.com/photos/4584304523",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  dakarCorniche: {
    file: "dakar-corniche",
    alt: "La corniche de Dakar au bord de l'océan, avec la ville à l'arrière-plan",
    title: "20130502-IMG 2225",
    author: "jbdodane",
    sourceUrl: "https://commons.wikimedia.org/w/index.php?curid=29236006",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
} as const satisfies Record<string, Photo>;

export const ALL_PHOTOS: Photo[] = Object.values(PHOTOS);
