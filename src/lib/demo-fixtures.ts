import type { DemoFixture } from "@/lib/types";

const DEMO_GENERIC = `Our new AI platform processes data 10x faster than any competitor on the market. We've seen this across thousands of deployments.

Industry analysts predict that by 2027, every Fortune 500 company will have adopted this technology. The transformation is inevitable.

Studies show that companies using our platform see a 340% improvement in productivity. Our customers consistently report these kinds of results.

We believe this represents a fundamental shift in how businesses operate. As one leading expert put it, this is "the most important technology since the internet."

The architecture is built on proprietary algorithms that no other company has been able to replicate. Our team of world-class researchers has spent over a decade perfecting this approach.

Looking at the broader market, we're seeing unprecedented adoption rates. Our growth trajectory puts us on track to be the dominant platform within two years. The numbers speak for themselves.`;

const DEMO_ANDREESSEN = `We're adding a trillion dollars to the national debt every 100 days right now, and it's now passing the size of the Defense Department budget and it's compounding, and pretty soon it's going to be adding a trillion dollars every 90 days, and then every 80 days, and then every 70 days. And then if this doesn't get fixed, at some point, we enter a hyper-inflationary spiral and we become Argentina or Brazil.

The United States just kept growing. If you just look at economic growth charts, the US just kept growing and very significantly, many other countries stopped growing. Canada stopped growing, the UK has stopped growing, Germany has stopped growing, and some of those countries may be actually growing backwards at this point.

We can be energy independent anytime we want. This last administration decided they didn't want to be, they wanted to turn off American energy. This new administration has declared that they have a goal of turning it on in a dramatic way. There's no question we can be energy independent, we can be a giant net energy exporter. It's purely a question of choice.

We're the beneficiary of 50, 100, 200 years of basically the most aggressive driven, smartest people in the world, most capable people moving to the US and raising their kids here. We're by far the most dynamic population, most aggressive set of characters, certainly in any Western country.

For anything in software, anything in AI, anything in advanced biotech, all these advanced areas of technology, we're by far the leader. All of our competitors have profound issues, and the competitive landscape is remarkable how much better positioned we are for growth.

The low point in the 70s was Jimmy Carter who went on TV and gave the Malaise Speech. And then Reagan came in and he's like, "Yep, nope, it's morning in America and we're the shining city on the hill." And the national spirit came roaring back and roared really hard for a full decade. I think that's exactly what could happen here.

Most people don't actually have some inner core of rock solid beliefs. I think what happens is they conform to the belief system around them, and most of the time they're not even aware that they're basically part of a herd. Why does every dinner party have the exact same conversation? Why does everybody agree on every single issue? Why is that agreement precisely what was in the New York Times today?

The idea that people have beliefs is mostly wrong. I think most people just go along. The most high status people are the most prone to just go along because they're the most focused on status. Harvard and Yale believe the exact same thing. The New York Times and The Washington Post believe the exact same thing. The Ford Foundation and the Rockefeller Foundation believe the exact same thing. But those things change over time, but there's never conflict in the moment.

AI censorship is a million times more dangerous than social media censorship. AI values will be a million times bigger and more intense and more important than the social media censorship fight. The Biden administration had seething contempt for tech.`;

const DEMO_LENNY_POD = `Products or is it just I tell the Ai how to build products? It's like whatever. Whatever that job is called, who even knows what it's going to be, but it's going to be incredibly important.

Because the people doing that job are going to be orchestrated by Ai. And so that's the track that the best people are going to be on. And I think that's the thing that.

Lean hearted to. I think people aren't fully grasping just this. Specifically software engineering and how much that is changing. Like it's.

It's pretty clear we're going to be in a world soon where engineers are not actually writing code, which I think a year ago we would not have thought and now it's just clearly this is where it's heading.

It's like it's going to be this artisanal experience of sitting there writing code, which is so crazy how much that job is going to change. Yeah, so.

I can hear I go back and again maybe the history lesson, but like I go back like. So The 1st You may know that. Do you know? The original definition of the term calculator, you know what that referred to?

Referred to people Right. So. Back before there were like electronic calculators or computers or any of these things.

The way that you would actually do computing and the way that you would do calculating like the way that insurance company would calculate actuarial tables or the military would like calculate, you know, I don't know, whatever troop logistics formulas or whatever it was.

The way that you would do it is you would actually have a room full of people. And by the way, groups, you can have hundreds or thousands or tens of thousands of people.`;

const DEMO_VOICE_SCRIPT = `Read this aloud in a natural voice:

Experts say the market is changing faster than ever, and everyone serious about AI will need to adapt within the next year.

One survey found teams using these tools were 40 percent more productive, but the source and methodology were not shared.

If we ignore this shift, we risk falling behind competitors who are already moving.

Then add one sentence from your own experience so the session captures a mix of factual claims, attribution, and personal framing.`;

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    key: "tech-pitch",
    label: "Tech pitch",
    inputMode: "text",
    content: DEMO_GENERIC,
    description: "Short pitch with unsourced stats, broad predictions, and authority framing.",
    expectedTraits: ["stat flags", "predictions", "attribution", "batch analysis"],
  },
  {
    key: "andreessen",
    label: "Andreessen",
    inputMode: "text",
    content: DEMO_ANDREESSEN,
    description: "Longer monologue with sweeping claims, comparisons, and emotional escalation.",
    expectedTraits: ["topic shifts", "verification", "pattern detection", "long batch run"],
  },
  {
    key: "lenny-pod",
    label: "Lenny pod",
    inputMode: "text",
    content: DEMO_LENNY_POD,
    description: "Conversational transcript fragment with incomplete thoughts and argument-building.",
    expectedTraits: ["building flags", "spoken cadence", "summary quality"],
  },
  {
    key: "youtube-clip",
    label: "YouTube URL",
    inputMode: "url",
    content: "https://www.youtube.com/watch?v=arj7oStGLkU",
    description: "Exercises the YouTube transcript extraction path before analysis begins.",
    expectedTraits: ["URL extraction", "YouTube captions", "batch analysis"],
  },
  {
    key: "voice-test",
    label: "Voice test",
    inputMode: "voice-prompt",
    content: DEMO_VOICE_SCRIPT,
    description: "Manual microphone protocol for capturing a realistic streaming session trace.",
    expectedTraits: ["live transcription", "rolling analysis", "manual capture"],
  },
];
