import AccountNav from '../components/account-nav';

const FAQS = [
  {
    question: 'Why poker?',
    answer: 'Poker is a game of incomplete information and uncertainty. A strong bot must reason about probability, expected value, risk, and opponents whose cards it cannot see—the same kinds of decisions that appear throughout quantitative work.',
  },
  {
    question: 'Is this a programming competition? What languages can I use?',
    answer: 'Yes. Competitors build fully autonomous bots in Python, C++, or Rust. Each bot reads the current game state and returns a legal fold, check, call, or raise.',
  },
  {
    question: 'How much coding experience is necessary?',
    answer: 'A basic rule-based bot is enough to begin. More advanced entries can use probability models, simulation, opponent tracking, search, or machine learning. The testing tools are designed to make iteration approachable at every level.',
  },
  {
    question: 'What form of poker is played?',
    answer: 'Bots compete in six-player no-limit Texas Hold’em tournaments. Every bot begins with an equal stack, blinds rise as hands are played, and the last bot with chips wins.',
  },
  {
    question: 'How do I test a bot?',
    answer: 'Clone the open-source engine and run the local scrimmage app. It accepts Python, C++, and Rust bots, runs large batches on your machine, and shows the latest hand without spending AWS credits.',
  },
  {
    question: 'Are previous versions saved?',
    answer: 'Yes. After signing in with a Georgia Tech email, every team submission is retained in the competition page’s version history.',
  },
];

function Logo() {
  return <span className="minimal-logo"><img src="/gt-poker-logo.jpeg" alt="AlgoPoker @ GT" /><strong>AlgoPoker @ GT</strong></span>;
}

export default function HomePage() {
  return <main className="minimal-home">
    <nav className="minimal-nav">
      <a href="/" aria-label="AlgoPoker @ GT home"><Logo /></a>
      <div><a href="/competition">Competition</a><AccountNav /></div>
    </nav>

    <section className="minimal-intro">
      <h1>What is AlgoPoker @ GT?</h1>
      <div className="minimal-copy">
        <p>AlgoPoker is a computerized poker tournament. Competitor teams program completely autonomous poker bots that play against one another in Six-Max no-limit Texas Hold’em tournaments.</p>
        <p>Building a competitive bot brings together mathematics, computer science, economics, and game theory. Your program must make decisions with incomplete information, manage risk, adapt to changing stack sizes, and respond to five independent opponents.</p>
        <p>Use the local scrimmage app to run large batches against built-in or custom strategies, inspect the latest hand, and iterate without waiting for cloud infrastructure. Upload finished versions when you are ready to submit. Mini tournaments will be run periodically and will post ELO ratings for each team&apos;s poker bot.</p>
      </div>
      <div className="minimal-actions"><a href="/competition">Enter the competition</a><a className="faq-jump" href="#faq">FAQ <span aria-hidden="true">↓</span></a></div>
    </section>

    <section className="minimal-faq" id="faq">
      <h2>FAQ</h2>
      <div>{FAQS.map((item) => <article key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div>
    </section>
  </main>;
}
