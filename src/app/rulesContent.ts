/**
 * The words of the "Future plans" notice (see RulesDialog.tsx), kept apart from the layout so the text
 * can be changed without touching the component.
 */
export const RULES_CONTENT = {
  title: 'Future plans of this project',
  reminder: {
    lead: 'A reminder:',
    text: 'this is a personal project, not an official application of the company. More and more of you are using it, so I want everyone to know that.',
  },
  rebuild: {
    heading: 'Rebuilt from scratch in mid-December',
    text: 'I will delete this site around mid-December and rebuild it with two goals: cleaner code underneath, and a redesigned UI/UX that uses the feedback I received, so it fits everyone, whether you are a beginner, medior or senior.',
  },
  features: {
    heading: 'What may come next',
    maybe: 'These features may come or not, depending on what I decide. I would like your opinions.',
    intro: 'As some of you have heard, I have been testing features in my own time that could take a lot of the annoyance out of the daily work:',
    items: [
      {
        name: 'Automatic API tool',
        text: 'Like a small Postman made for Crestron devices. Pick a group, tick the units, choose a saved call or send your own, and read the answers side by side, in about 3 to 4 clicks.',
        benefits:
          'Compared to Postman: no digging through the API documentation, the device login is handled for you, one call runs on several units at once and their answers are compared in one table, calls you use often are saved, and any change asks you to review it first.',
        credit: 'This concept was inspired by senior Rhys.',
      },
      {
        name: 'Concept terminal',
        text: 'Works like a command prompt, with the API tool and small extras (to be decided) built in. Meant for setting up, testing and checking units.',
      },
      {
        name: 'Application mode',
        text: 'A better flow of work: a systematic structure built on how you actually work today, linking all the features together.',
      },
      {
        name: 'Warning system',
        text: 'Warnings on different subjects related to the work and to the site itself.',
        credit: 'This concept was inspired by senior Kevin.',
      },
      {
        name: 'NMBS train assistant',
        text: 'A page that does two things for those who take the train to work:',
        points: [
          'Interim refunds: for people on an interim contract. It reads your activated or purchased ticket and sends the details to the interim of your choice, with one button on your phone. I built this privately for myself before, and I have never missed getting my money back since.',
          'Train tracking: for the way home after work. See directly, or get a clear popup, when your train is coming, using a public API.',
        ],
      },
    ],
    outro: 'Other ideas exist, but I am not sure I will add them. I first have to check them against the rules.',
    credits: {
      text: 'Some of these ideas were inspired by others, and',
      emphasis: 'they deserve the credit!',
    },
    responsible: {
      lead: 'I am fully responsible.',
      text: 'I am the one building this. If something is not allowed or goes wrong, the responsibility is mine alone, not the people who inspired it.',
    },
  },
  warning: {
    heading: 'Be warned',
    points: [
      'This is a personal project. It stores everything in a folder of JSON files on each computer. Nothing like guides or links is saved online, to respect company policy.',
      'Because of that, some features will not be released, and no complex features will be added for now.',
    ],
    closing: 'Remember: personal project, not official.',
    decision: {
      main: 'If management decides this project is not allowed, even if the site breaks no policy, I will respect that and delete this version on that same day.',
      also: 'Also be aware: I can delete this personal project myself at any point, for any reason. I have no attachment to it.',
    },
  },
  button: 'I understand',
  sidebarLabel: 'RULES',
} as const
