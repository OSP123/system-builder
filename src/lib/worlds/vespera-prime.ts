import type { WorldSpec } from "../world-import";

/**
 * Vespera Prime, imported from the slow-grow-trainer project
 * (src/components/CampaignTimeline.tsx, src/data/theatres.ts,
 * src/features/dashboard/Dashboard.tsx, src/components/TacticalSectorMap.tsx and
 * src/features/briefing/Briefing.tsx). Text is carried over as written; the
 * only change is the world's name, normalised to "Vespera Prime".
 *
 * Not imported: the theatre artwork (by Yaro, pending permission), and
 * anything that lives only in that app's database (admin-placed map
 * locations, players' army lore and battle reports).
 */

const TRANSMISSION = `+++ INCOMING VOX TRANSMISSION +++  
SOURCE ID: Planetary Governer Silvanus Petro  
DESTINATION: Imperial Forces of Vespera Prime  
ENCRYPTION LEVEL: Secure Alpha  
DATE/STAMP: 01.07.M41 / 0200 HRS

--- MESSAGE BEGINS ---

My loyal forces! We have had attacks across all parts of the planet now. You have seen what they're doing.

The enemies are everywhere. They're not just the heretic rabble. The nobles must be in on it too. Yes, they're all conspiring against me. They want to have this planet for themselves. I won't have it! We will crush my enemies have this world cleansed. I would destroy the factories before letting anyone else have them.

All forces are hereby ordered to retreat back to the inner walls closest to the palace. My retinue and I are too valuable to lose. I have requisitioned a lander to bring us off world. From there, my forces and I will - yes, what is Lanksheim? For throne's sake, I'm in the middle of a broadcast! What do you mean? No, I never invited anyone named - Who the hell are you? Get out of my chamber at once!

**Inquisitor Charmeleus Kane: Governor Silvanus Petro, you have been found wanting in your duties to this world by the Inquisition. You are hereby relieved of your command and your life.**

*(Gunshot)*

Forces of the Imperium, my name is Inquisitor Charmeleus Kane. I am now in command of the forces of this world. Unfortunately, your governor was weak and stupid. I am not. You are to remain at your posts. My spies have informed me of the situation on this world and it is much worse than even your governor’s paranoia. Several of the so-called noble houses of this planet have aligned themselves with Xenos in exchange for simple wealth, while some others have corrupted themselves with other forms of heresy. It is no matter. My team will root out the heretics and traitors from this world. It is up to you and the forces I have requested to defend this planet while I do so. The mineral and promethium deposits here are crucial for the battles in the neighboring systems. We need to make sure those supplies continue flowing out of this planet. Your lives depend on it.

Prove to me you are not as weak as your simpleton governor. Do your duty and you shall not be found wanting.

The Emperor Protects.

--- MESSAGE ENDS ---  
+++ AUTHENTICATION: 9324282301 +++  
+++ END OF TRANSMISSION +++`;

type Sector = { name: string; pointsLevel: number; shape: string; cx: number; cy: number };
const s = (name: string, pointsLevel: number, shape: string, cx: number, cy: number): Sector => ({ name, pointsLevel, shape, cx, cy });

export const VESPERA_PRIME: WorldSpec = {
  world: {
    slug: "vespera-prime",
    name: "Vespera Prime",
    tagline: "The Siege of Vespera",
    published: true,
    summary: `War has come to every part of Vespera Prime. Several of its noble houses have aligned themselves with Xenos in exchange for wealth; others have fallen to heresy. On 01.07.M41 the Inquisition ended the rule of Planetary Governor Silvanus Petro, and Inquisitor Charmeleus Kane took command of the world's forces.

The planet's mineral and promethium deposits are crucial for the battles in the neighbouring systems, and those supplies must keep flowing.

## Theatres of War

Six war zones divide the planet: **The Hive Spires**, **The Ash Wastes**, **The Magma Forges**, **Orbital Relay Station**, **The Sump Ruins** and **The Toxic Oceans**. Every war zone is split between the factions with a presence there; the Imperium and Chaos began evenly matched, and every other faction has had to fight its way onto the map.`,
  },
  system: {
    slug: "vespera",
    name: "Vespera",
    segmentum: "Segmentum Solar",
    x: -14_000,
    y: -200,
    z: 12_000,
    published: true,
  },
  planet: {
    slug: "vespera-prime",
    name: "Vespera Prime",
    classification: "Hive World",
    orbitIndex: 1,
    published: true,
    description: `The administrative and population hubs of the planet rise in the Hive Spires. Beyond them lie rad-soaked ash wastes, Adeptus Mechanicus forges built over deep crust fissures, blast craters dating back to the Horus Heresy, and chemical-soup seas that cool the planet's massive industrial sectors. An orbital comms relay secures the skies.`,
    // The slow-grow-trainer globe's own texture (public/images/planet-texture.png there), bundled here so it
    // survives free-tier restarts; the colours below are only the fallback while it loads.
    genParams: {
      texture: "/textures/vespera-prime.jpg",
      seed: 7314,
      water: 0.35,
      clouds: 0.35,
      cloudColor: "#6b6660",
      atmosphere: "#b0703a",
      atmosphereStrength: 0.55,
      lava: 0.22,
      lights: 0.55,
      ice: 0.05,
      detail: 1.8,
      palette: { deep: "#0f2233", shallow: "#2a4a60", low: "#4a4036", mid: "#5c4f42", high: "#6e604f", peak: "#8f8475" },
    },
  },
  regions: [
    {
      slug: "the-hive-spires",
      name: "The Hive Spires",
      kind: "Theatre of war",
      lat: 15,
      lng: 20,
      summary:
        "The administrative and population hubs of the planet. Imperium forces try to hold order, while Chaos cults plot assassinations and T'au operatives spark citizen rebellions in the lower tiers.",
      terrain: "Pyramidal spire fortress: a tiered stronghold ascending to the apex.",
      sectors: [
        s("Outer Wall", 400, "100,450 700,450 640,380 160,380", 400, 415),
        s("Hab Districts", 800, "180,375 620,375 560,290 240,290", 400, 332),
        s("Merchant Quarter", 1200, "260,285 540,285 490,200 310,200", 400, 242),
        s("Administratum", 1600, "325,195 475,195 440,110 360,110", 400, 152),
        s("Spire Apex", 2000, "370,105 430,105 400,30", 400, 80),
      ],
    },
    {
      slug: "the-ash-wastes",
      name: "The Ash Wastes",
      kind: "Theatre of war",
      lat: 25,
      lng: 10,
      summary:
        "Rad-soaked, toxic wastelands home to nomadic human tribes. Space Marines and Astra Militarum launch purges to maintain control, while T'au stealth cadres work to win over the nomadic outcasts.",
      terrain: "Sprawling canyon island: an irregular perimeter enclosing a dead zone stronghold.",
      sectors: [
        s("Rad Perimeter", 400, "80,380 220,440 400,450 350,360 200,350 120,280", 230, 380),
        s("Nomad Trail", 800, "410,450 700,400 640,320 450,340 360,365", 510, 385),
        s("Storm Corridor", 1200, "650,310 740,220 660,130 520,180 540,280", 620, 220),
        s("Scavenger Dens", 1600, "500,170 640,120 450,60 300,100 380,200", 450, 130),
        s("Dead Zone", 2000, "220,340 350,350 370,210 280,110 140,200", 270, 240),
      ],
    },
    {
      slug: "the-magma-forges",
      name: "The Magma Forges",
      kind: "Theatre of war",
      lat: 45,
      lng: 60,
      summary:
        "Enormous Adeptus Mechanicus structures built directly over deep crust fissures. AdMech forces defend the vital promethium extraction manufactorums, while Ork scrap-looters and Leagues of Votann mining operations attempt to strip and dismantle the heavy infrastructure.",
      terrain: "Heavy industrial refinery: an angular, octagonal blast-door layout.",
      sectors: [
        s("Cooling Vents", 400, "100,200 240,140 240,360 100,300", 170, 250),
        s("Extraction Bay", 800, "560,140 700,200 700,300 560,360", 630, 250),
        s("Foundry Floor", 1200, "250,370 550,370 480,460 320,460", 400, 415),
        s("Slag Channels", 1600, "320,40 480,40 550,130 250,130", 400, 85),
        s("Forge Core", 2000, "260,150 540,150 540,350 260,350", 400, 250),
      ],
    },
    {
      slug: "orbital-relay-station",
      name: "Orbital Relay Station",
      kind: "Theatre of war",
      lat: -10,
      lng: -55,
      summary:
        "A massive orbital comms relay with defensive emplacements securing the skies. Strike teams target this network to blind the Imperial fleet and trap the surface defenders, while the Imperium fights desperately to keep the relay online.",
      terrain: "Orbital star hub: concentric platforms radiating around a command core.",
      sectors: [
        s("Docking Pylons", 400, "120,80 320,120 260,220 100,160", 200, 145),
        s("Comms Array", 800, "480,120 680,80 700,160 540,220", 600, 145),
        s("Weapons Battery", 1200, "540,280 700,340 660,420 480,380", 595, 355),
        s("Engineering Deck", 1600, "260,280 320,380 140,420 100,340", 205, 355),
        s("Command Bridge", 2000, "340,180 460,180 500,250 460,320 340,320 300,250", 400, 250),
      ],
    },
    {
      slug: "the-sump-ruins",
      name: "The Sump Ruins",
      kind: "Theatre of war",
      lat: -25,
      lng: 135,
      summary:
        "Pockmarked blast craters thousands of feet deep dating back to the Horus Heresy. Thousand Sons and Chaos Daemons utilize these cursed depths to enact dark warp rituals, while Necrons slowly awaken from deep tombs buried beneath the ancient battlefields.",
      terrain: "Shattered crater: jagged, fragmented shards surrounding an impact epicentre. A great tomb world lies beneath.",
      sectors: [
        s("Crater Rim", 400, "80,150 240,180 200,350 100,400 60,280", 140, 270),
        s("Outer Ruins", 800, "220,370 560,420 640,450 360,470 120,420", 380, 425),
        s("Collapsed Tunnels", 1200, "580,390 740,320 700,160 560,200 520,300", 620, 270),
        s("Warp Fissure", 1600, "260,160 540,180 660,140 450,60 200,80", 420, 125),
        s("Buried Tomb", 2000, "260,190 520,210 500,360 220,340", 375, 275),
      ],
    },
    {
      slug: "the-toxic-oceans",
      name: "The Toxic Oceans",
      kind: "Theatre of war",
      lat: 60,
      lng: -110,
      summary:
        "Chemical-soup seas vital for cooling the planet's massive industrial sectors. This territory serves as the prime staging ground for brutal naval-style beachhead assaults, amphibious landings, and efforts to purge mutated sea horrors.",
      terrain: "Offshore archipelago: connected deep-sea platforms.",
      sectors: [
        s("Shore Batteries", 400, "60,160 200,160 220,340 80,360", 140, 260),
        s("Tidal Zone", 800, "240,100 400,120 380,240 220,200", 310, 165),
        s("Deep Channels", 1200, "240,360 440,380 420,460 260,440", 340, 410),
        s("Leviathan Depths", 1600, "460,220 640,180 680,340 460,360", 560, 275),
        s("Abyssal Trench", 2000, "680,150 780,200 760,320 660,380", 720, 260),
      ],
    },
  ],
  articles: [
    {
      slug: "the-siege-of-vespera",
      title: "The Siege of Vespera",
      category: "BATTLE",
      summary: "Every faction fights for a share of Vespera Prime's six war zones.",
      tags: ["vespera"],
      published: true,
      body: `Every war zone on Vespera Prime is split between the factions with a presence there. The Imperium and Chaos began evenly matched; every other faction has had to fight its way onto the map.

- **Imperium** forces reinforce defences and purge corruption to raise Imperial control and burn back the warp.
- **Chaos** completes dark rituals and despoils Imperial holdings to spread corruption and break Imperial order.
- **Necrons** rouse dynasties, breach tomb seals and reclaim lost technology. Waking a tomb complex stirs the great tomb world beneath **The Sump Ruins**.
- **The Leagues of Votann** extract, strip and escort materiel to feed their Ancestor Cores: securing promethium caches, dismantling heavy industry and bringing mining convoys through.
- **The T'au Empire** breaks up warp rituals, wins over the local populace and embeds stealth cadres to widen its foothold.
- **Orks** loot scrap hauls, **Aeldari** anchor webway raids, **Drukhari** lead realspace raids, **Tyranids** consume biomass and **Genestealer Cults** seed new broods.`,
    },
  ],
  characters: [
    {
      slug: "silvanus-petro",
      name: "Silvanus Petro",
      title: "Planetary Governor",
      faction: "Imperium of Man",
      status: "DECEASED",
      sortOrder: 1,
      published: true,
      quote: "I would destroy the factories before letting anyone else have them.",
      quoteSource: "Governor Silvanus Petro, final broadcast",
      summary: "The paranoid Planetary Governor of Vespera Prime, executed by the Inquisition mid-broadcast.",
      body: `Planetary Governor of Vespera Prime. As attacks spread across every part of the planet, Petro came to believe the noble houses were conspiring against him. In his final vox broadcast he ordered all forces back to the inner walls closest to the palace and revealed he had requisitioned a lander to carry himself and his retinue off world.

He was interrupted by Inquisitor Charmeleus Kane, who found him wanting in his duties to the world and relieved him of his command and his life.`,
    },
    {
      slug: "charmeleus-kane",
      name: "Charmeleus Kane",
      title: "Inquisitor",
      faction: "The Inquisition",
      status: "ACTIVE",
      sortOrder: 2,
      published: true,
      quote: "Do your duty and you shall not be found wanting.",
      quoteSource: "Inquisitor Charmeleus Kane",
      summary: "The Inquisitor who executed Governor Petro and took command of Vespera Prime's forces.",
      body: `Inquisitor of the Imperium who took command of Vespera Prime's forces after executing Governor Silvanus Petro during his broadcast. Through his spies, Kane learned that several of the planet's noble houses had aligned themselves with Xenos in exchange for wealth while others turned to heresy.

His team hunts the heretics and traitors while the world's defenders, and the forces he has requested, hold the planet and keep its mineral and promethium supplies flowing to the battles in the neighbouring systems.`,
    },
  ],
  narratives: [
    {
      slug: "incoming-vox-transmission",
      title: "Incoming Vox Transmission",
      subtitle: "Sector Command, 01.07.M41",
      epigraph: "The Emperor Protects.",
      epigraphSource: "Inquisitor Charmeleus Kane",
      summary: "Governor Petro's last broadcast, and the Inquisitor who ended it.",
      characters: ["silvanus-petro", "charmeleus-kane"],
      published: true,
      body: TRANSMISSION,
    },
  ],
};
