/**
 * SUMSHODHINI '26 — CAMPUS NAVIGATION & QR TRAIL DATA
 * Force Racing · Kakatiya Institute of Technology & Science, Warangal
 * 
 * 15 Checkpoints: 10 Circuit Sectors (01-10) + 5 Paddock Bonus Points (B1-B5).
 * Standalone, modular, zero external dependencies.
 */
(function (global) {
  'use strict';

  var event = {
    name: "SUMSHODHINI",
    edition: "'26",
    programme: "F1 SIM RACING",
    host: "FORCE RACING",
    dept: "Department of Mechanical Engineering",
    date: "31 October 2026",
    venue: "Central Workshop",
    campus: "Kakatiya Institute of Technology & Science",
    address: "Warangal – 506015, Telangana, India",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Force+Racing+India+KITS+Warangal",
    siteUrl: "https://force-racing.force-racing-revival.workers.dev/",
    registerUrl: "campaign.html#register",
    fee: "₹99",
    minutes: 10,
    contactName: "Md. Sohail",
    contactPhone: "+91 8008391525",
    tagline: "Ten minutes. One machine. Prove you can read the road.",
    stats: {
      routeSectors: 10,
      bonusStations: 5,
      totalCheckpoints: 15,
      circuitDistance: "~1.2 km Circuit",
      pitWalkDuration: "15 min Pit Walk",
      targetVenue: "Central Workshop (Simulator Bay)"
    }
  };

  var sectors = [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 1,
      sector: "01",
      kind: "route",
      scene: "ignition",
      kicker: "LIGHTS OUT",
      title: "THE GRID",
      location: "Main Gate",
      place: "main gate",
      walk: "Starting Grid",
      direction: "North",
      map: { x: 50, y: 122 },
      riddle: "The first code is on the gate pillar beside the security cabin. Scan it and the trail starts.",
      plain: "On the main gate pillar beside the security cabin, at shoulder height.",
      directions: [
        "You are at the campus entrance. The starting QR code is mounted on the pillar next to the security cabin.",
        "Stand facing inward with the outer road behind you — the circuit runs deep into campus from here."
      ],
      mapsQuery: "Main Gate KITS Warangal",
      trivia: {
        prompt: "Reaction time of an F1 driver when the 5 red lights extinguish on the starting grid:",
        answer: "0.20 seconds",
        note: "Top F1 drivers react in 0.20s to 0.25s. Anything below 0.15s is essentially anticipation or a jump start penalty (Bottas once nailed a legendary 0.201s launch)!"
      }
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 2,
      sector: "02",
      kind: "route",
      scene: "wheel",
      kicker: "HANDS ON",
      title: "FORCE FEEDBACK",
      location: "Administrative Block",
      place: "administrative block",
      walk: "about 2 minutes",
      direction: "North-West",
      map: { x: 24, y: 108 },
      riddle: "The flagpole building that wants your paperwork. Up the front steps, turn left inside, and the code is on the wall beside the enquiry counter.",
      plain: "Administrative Block — ground floor, on the wall left of the enquiry counter, at chest height.",
      directions: [
        "From the gate pillar, proceed through the main archway and follow the central avenue.",
        "At the first fork, bear left toward the administrative building with the central flagpole.",
        "Ascend the front steps, enter the main doors, and check the wall immediately left of the enquiry counter."
      ],
      mapsQuery: "Administrative Block KITS Warangal",
      trivia: {
        prompt: "How much steering lock does a modern Formula 1 car use?",
        answer: "360° to 400° lock-to-lock",
        note: "Unlike street cars requiring 900° (2.5 full turns), F1 steering racks rotate only ~360°. Millimetric inputs dart the front wing instantly."
      }
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 3,
      sector: "03",
      kind: "route",
      scene: "pedals",
      kicker: "PEDAL WORK",
      title: "BRAKE LATE?",
      location: "Central Library",
      place: "central library",
      walk: "about 3 minutes",
      direction: "North-East",
      map: { x: 55, y: 100 },
      riddle: "Silence has an address. Where phones get switched off, walk past the reading hall and check the end panel of the first rack.",
      plain: "Central Library — inside the reading hall, on the end panel of the first rack.",
      directions: [
        "Exit the Administrative Block and turn right along the tree-lined walkway.",
        "Follow the covered path toward the prominent glass-fronted Central Library.",
        "Enter through the main reading hall, take the first aisle on the left, and check the end panel of rack #1."
      ],
      mapsQuery: "Central Library KITS Warangal",
      trivia: {
        prompt: "Braking force exerted into Monza Turn 1 from 350 km/h:",
        answer: "130 kg+ of pure leg pressure",
        note: "F1 cars have no hydraulic brake booster assist. Drivers stomp over 130 kg of direct leg force into the carbon-carbon pedal face every single lap."
      }
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 4,
      sector: "04",
      kind: "route",
      scene: "gears",
      kicker: "SHIFT",
      title: "SMOOTH IS FAST",
      location: "Block-I",
      place: "block one",
      walk: "about 2 minutes",
      direction: "East",
      map: { x: 82, y: 88 },
      riddle: "Long ground-floor corridor, doors that all look the same. Walk to the far end where it turns, and check the wall near the stairs.",
      plain: "Block-I — far end of the ground-floor corridor, near the stairs.",
      directions: [
        "Exit the library and turn right, proceeding past the central quadrangle.",
        "Block-I is the long academic complex directly on your left.",
        "Walk down the ground-floor corridor toward the east stairwell landing."
      ],
      mapsQuery: "Block I KITS Warangal",
      trivia: {
        prompt: "F1 seamless-shift transmission change time:",
        answer: "0.005 seconds (5 milliseconds)",
        note: "Seamless gearboxes use twin selector barrels to engage the next ratio before disengaging the current one, providing uninterrupted torque delivery."
      }
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 5,
      sector: "05",
      kind: "route",
      scene: "track",
      kicker: "THE LINE",
      title: "FIND THE LINE",
      location: "Indoor Stadium",
      place: "indoor stadium",
      walk: "about 4 minutes",
      direction: "West",
      map: { x: 24, y: 82 },
      riddle: "Sweat, squeaking shoes, and a scoreboard nobody is watching. Use the side gate, go under the gallery, and look behind the last row of benches.",
      plain: "Indoor Stadium — under the gallery, behind the last bench.",
      directions: [
        "From Block-I, navigate back west across the central plaza.",
        "The Indoor Stadium is the high-clearance sports arena with high roller shutters.",
        "Enter through the spectator side portal, step beneath the bleachers gallery, and look behind the final bench."
      ],
      mapsQuery: "Indoor Stadium KITS Warangal",
      trivia: {
        prompt: "McLaren's world-record F1 pit stop at Qatar 2023:",
        answer: "1.80 seconds flat",
        note: "Twenty mechanics swapped all four 18-inch wheels and launched Lando Norris back out in 1.80s — faster than an average human eye blink."
      }
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 6,
      sector: "06",
      kind: "route",
      scene: "rain",
      kicker: "WET GRIP",
      title: "READ THE WEATHER",
      location: "Boys Dining Hall",
      place: "dining hall",
      walk: "about 2 minutes",
      direction: "North-East",
      map: { x: 52, y: 70 },
      riddle: "Follow whoever looks happiest. The mess is loud at this hour — the code waits by the hand-wash taps at the side entrance.",
      plain: "Boys Dining Hall — beside the hand-wash taps at the side entrance.",
      directions: [
        "Exit the Indoor Stadium and take the paved pedestrian lane bearing right.",
        "Follow the path heading towards the student residential dining complex.",
        "Use the side wash portal entrance; the badge is adjacent to the stainless steel basin pillars."
      ],
      mapsQuery: "Dining Hall KITS Warangal",
      trivia: {
        prompt: "Pirelli full-wet tyre water evacuation capacity at 300 km/h:",
        answer: "85 litres per second per tyre",
        note: "Four wet compound tyres pump 340 litres/sec out of the track surface to fight deadly aquaplaning. That fills a 1,000L water tank in 3 seconds!"
      }
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 7,
      sector: "07",
      kind: "route",
      scene: "night",
      kicker: "NIGHT RUN",
      title: "LOOK AHEAD",
      location: "Block-III",
      place: "block three",
      walk: "about 3 minutes",
      direction: "East",
      map: { x: 82, y: 58 },
      riddle: "Three floors, one staircase. Take the middle one, count two landings, and read the board nobody reads.",
      plain: "Block-III — second landing, on the notice board.",
      directions: [
        "From the dining hall, cut across the open courtyard towards the tall multi-story Block-III.",
        "Enter through the central breezeway and locate the center stairwell.",
        "Climb up two flights to the second-floor landing and check the departmental board."
      ],
      mapsQuery: "Block III KITS Warangal",
      trivia: {
        prompt: "Cockpit temperatures inside an F1 car during the Singapore GP:",
        answer: "55°C (131°F) at 80% humidity",
        note: "Cockpit conditions resemble a sealed Finnish sauna. Drivers lose 3 to 4 kg of body fluid over 61 grueling street laps."
      }
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 8,
      sector: "08",
      kind: "route",
      scene: "apex",
      kicker: "APEX",
      title: "CLIP IT",
      location: "Block-V",
      place: "block five",
      walk: "about 4 minutes",
      direction: "West",
      map: { x: 28, y: 50 },
      riddle: "The newest block, the emptiest corridor. Follow it to the water cooler that hums at the far end and look behind it.",
      plain: "Block-V — behind the water cooler at the end of the ground-floor corridor.",
      directions: [
        "Descend the Block-III stairwell and head west past the shaded vehicle pavilion.",
        "Block-V is the contemporary academic structure on the west quadrant.",
        "Traverse the main ground-floor corridor all the way to the water refreshment alcove."
      ],
      mapsQuery: "Block V KITS Warangal",
      trivia: {
        prompt: "Peak lateral cornering force at Silverstone's Maggotts-Becketts complex:",
        answer: "5.2G lateral acceleration",
        note: "At 5.2Gs, a driver's 7kg helmet and head violently pulls 36+ kg against their neck muscles as the car snaps direction at 280 km/h."
      }
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 9,
      sector: "09",
      kind: "route",
      scene: "pit",
      kicker: "PIT WALL",
      title: "THE CLOCK",
      location: "Mechanical Block",
      place: "mechanical block",
      walk: "about 3 minutes",
      direction: "North-East",
      map: { x: 68, y: 36 },
      riddle: "Now it smells like oil and machine tools. In the Mechanical Block lobby, find the model cabinet and the display board beside it.",
      plain: "Mechanical Block — lobby, beside the model cabinet.",
      directions: [
        "From Block-V, follow the drone of CNC mills toward the Department of Mechanical Engineering.",
        "Enter the primary Mechanical Engineering atrium with engineering display models.",
        "Locate the acrylic showcase cabinet; the QR badge is mounted on the adjacent display placard."
      ],
      mapsQuery: "Mechanical Engineering Department KITS Warangal",
      trivia: {
        prompt: "Famous Ferrari team radio quote during questionable race strategy:",
        answer: "'Box box... stay out, stay out! We are checking.'",
        note: "The legendary pit wall indecision meme. In sim racing, trust your delta time, not radio second-guessing!"
      }
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 10,
      sector: "10",
      kind: "route",
      scene: "gate",
      kicker: "ARRIVAL / SIM ACCESS",
      title: "YOU'RE IN",
      location: "Central Workshop",
      place: "Central Workshop",
      walk: "about 2 minutes",
      direction: "North-West",
      map: { x: 36, y: 22 },
      riddle: "You can hear it now — bass, lights, a crowd at the high-roofed hall. The last code is on the right-hand door frame of the entrance.",
      plain: "Central Workshop entrance — right-hand door frame.",
      directions: [
        "From the Mechanical Block lobby, follow the covered industrial gantry west toward the fabrication sheds.",
        "The Central Workshop is the expansive high-roof hall vibrating with crowds, simulation audio, and engine dyno notes.",
        "Scan the QR badge mounted on the right steel portal frame — then step directly into the paddock!"
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "First rule before stepping into the Force Racing simulator cockpit:",
        answer: "Adjust pedal distance for 100% threshold brake travel",
        note: "Ergonomics dictate pace. Proper leverage over the load-cell brake is the difference between a podium hot lap and flat-spotting into Turn 1."
      }
    },

    /* ------------------------------------------------------------------ B1 */
    {
      id: 11,
      sector: "B1",
      kind: "bonus",
      scene: "pay",
      kicker: "BONUS · DESK",
      title: "THE FEE",
      location: "Registration Desk",
      place: "registration desk",
      walk: "Inside Paddock Arena",
      direction: "Inside",
      map: { x: 20, y: 15 },
      riddle: "Bonus sector. Scan it, score it, keep moving.",
      plain: "On the registration desk, facing the queue.",
      directions: [
        "Located inside the Central Workshop main hall.",
        "Approach the official Force Racing registration desk where participant check-in occurs."
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "Sim racing thrills vs F1 billionaire pay-driver ROI:",
        answer: "₹9.90 per minute of pure adrenaline",
        note: "Lawrence Stroll spent $150M+ for Lance's seat. At ₹99 for a direct-drive Sumshodhini session with zero carbon-fiber repair bills, your ROI wins hands down."
      }
    },

    /* ------------------------------------------------------------------ B2 */
    {
      id: 12,
      sector: "B2",
      kind: "bonus",
      scene: "queue",
      kicker: "BONUS · QUEUE",
      title: "TEN MINUTES",
      location: "Queue Line",
      place: "queue line",
      walk: "Inside Paddock Arena",
      direction: "Inside",
      map: { x: 28, y: 10 },
      riddle: "Bonus sector. Free points while you wait.",
      plain: "On the queue divider, about head height.",
      directions: [
        "Move into the stanchion queue line leading towards the active simulator rigs.",
        "The code is positioned on the queue boundary partition at eye level."
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "What was Max Verstappen doing at 3:30 AM before winning the 2024 Imola GP?",
        answer: "Driving a 3 AM sim stint in the 24H of Nürburgring (and winning both)",
        note: "Max installed his sim rig inside his GP motorhome, drove a midnight stint for Team Redline, then went out and took the real F1 chequered flag."
      }
    },

    /* ------------------------------------------------------------------ B3 */
    {
      id: 13,
      sector: "B3",
      kind: "bonus",
      scene: "photo",
      kicker: "BONUS · WALL",
      title: "GRID WALK",
      location: "Photo Wall",
      place: "photo wall",
      walk: "Inside Paddock Arena",
      direction: "Inside",
      map: { x: 44, y: 9 },
      riddle: "Bonus sector. Look good, scan fast.",
      plain: "Photo wall backdrop — bottom right corner.",
      directions: [
        "Locate the official Force Racing & Sumshodhini '26 photo backdrop wall.",
        "The QR code is affixed to the lower right corner frame."
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "Iconic Kimi Räikkönen team radio response when disturbed mid-race:",
        answer: "'Leave me alone, I know what to do.'",
        note: "Abu Dhabi 2012 heritage. Minimal words, maximum speed. Snap your photo and get to the cockpit."
      }
    },

    /* ------------------------------------------------------------------ B4 */
    {
      id: 14,
      sector: "B4",
      kind: "bonus",
      scene: "sim",
      kicker: "BONUS · RIG",
      title: "STRAP IN",
      location: "Simulator Bay",
      place: "simulator bay",
      walk: "Inside Paddock Arena",
      direction: "Inside",
      map: { x: 54, y: 14 },
      riddle: "Bonus sector. The machine is right there.",
      plain: "On the simulator rig frame, near the wheel.",
      directions: [
        "Step up to the active Force Racing simulator rigs.",
        "Check the structural extruded aluminum chassis upright beside the direct-drive base."
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "Manufacturing cost of a real carbon-fiber Formula 1 steering wheel:",
        answer: "$60,000 to $100,000 USD (₹50 to ₹85 Lakhs)",
        note: "Crafted with bespoke carbon weaves, rotary switches, hall-effect clutches, and OLED telemetry displays. Handle our sim wheel with equal precision!"
      }
    },

    /* ------------------------------------------------------------------ B5 */
    {
      id: 15,
      sector: "B5",
      kind: "bonus",
      scene: "exit",
      kicker: "BONUS · EXIT",
      title: "NEXT LAP",
      location: "Exit Gate",
      place: "exit gate",
      walk: "Paddock Exit Way",
      direction: "Exit Portal",
      map: { x: 42, y: 22 },
      riddle: "Bonus sector. One last scan before you go.",
      plain: "On the exit gate, facing the corridor.",
      directions: [
        "Following your hot lap stint, follow the exit wayfinding arrows.",
        "Scan the final bonus badge stationed on the exit doorway jamb."
      ],
      mapsQuery: "Central Workshop KITS Warangal",
      trivia: {
        prompt: "Guenther Steiner's immortal debrief evaluation:",
        answer: "'We look like a bunch of rockstars (or wankers)!'",
        note: "Motorsport is high stakes. Review your delta sectors on the leaderboard, debrief with the Force Racing engineers, and come back faster next year!"
      }
    }
  ];

  var trailData = {
    event: Object.freeze(event),
    sectors: Object.freeze(sectors)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = trailData;
  }
  if (typeof global !== 'undefined') {
    global.CampusTrailData = trailData;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
