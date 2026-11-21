
"use strict";
/* ============ SEEDED RNG — every level unique, never duplicated ============ */
function rng(seed){var t=seed>>>0;return function(){t+=0x6D2B79F5;var r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;}}
function pick(r,arr){return arr[Math.floor(r()*arr.length)];}

/* ============ CURRICULUM: 25 core lessons, then advanced rotations ============ */
var CORE=[
 ["What Is a Stock?","A stock is a slice of ownership. Buy one share and you own a tiny piece of that company — its wins and its stumbles. If the company grows, your slice is worth more.","Start small. Ownership is the whole game."],
 ["The Market Is a Stage","A stock market is where buyers and sellers meet, like a cypher — everybody steps in, prices move with the energy in the room. The price is simply what the last person paid.","Watch the room before you jump in."],
 ["Bulls, Bears & the Beat","Bulls charge up (prices rising), bears swipe down (prices falling). Naming the trend tells you which way the beat is moving before you dance.","Trade with the trend, not against it."],
 ["Buy Low, Sell High","The oldest bar in the book: buy when a good company is cheap, sell when it's expensive. Sounds simple — the hard part is staying calm when the crowd panics.","Patience is a position."],
 ["BOSS: First Gate","Boss level. Everything so far, one chart, higher target. Prove you can read the room under pressure.","Bosses guard every gate. Beat the target."],
 ["Dividends: Money While You Sleep","Some companies pay owners a cut of profits called a dividend — cash that lands in your account just for holding shares. That's rent on your ownership.","Dividends reward holders, not gamblers."],
 ["Diversification: Don't Bet the Album on One Track","Spreading money across different companies is diversification. If one track flops, the album still sells. One stock can crash; a basket rarely does.","Never let one position decide your whole night."],
 ["Risk & the Drop","Every investment can fall. Risk isn't the enemy — unmanaged risk is. Only play money you can afford to see dip while the story plays out.","Size your bets so a loss can't end you."],
 ["Reading a Chart","A chart is the song's waveform: price over time. Peaks, valleys, and the direction between them tell you the story before the lyrics start.","Look left to right. Trend first, details second."],
 ["BOSS: Chart Reader","Boss level. A trickier chart with fake-outs. Trust the trend, not the noise.","Fake moves shake out rookies. Hold your read."],
 ["ETFs: The Whole Playlist in One Buy","An ETF is one purchase that holds many companies — like streaming a whole playlist instead of buying one song. Instant diversification, one ticket.","Playlists beat one-hit wonders for beginners."],
 ["Market Cap: How Big Is the Act?","Market cap = share price × total shares. It tells you the size of the whole company, not just the price of one ticket. A $5 stock can be a giant; a $500 stock can be small.","Price alone never tells you size."],
 ["Volume: How Loud Is the Crowd?","Volume is how many shares changed hands. Big moves on big volume mean the whole crowd believes it. Big moves on tiny volume? Probably noise.","Loud moves matter. Quiet moves lie."],
 ["P/E Ratio: Price vs. Earnings","The P/E ratio compares a stock's price to the profit the company actually makes. High P/E = the crowd expects a superstar future. Low P/E = bargain bin — or a warning.","Ask what you're paying for each dollar of profit."],
 ["BOSS: The Valuation Battle","Boss level. An overhyped stock, a tempting chart. Use value, not hype, to time your trades.","Hype is loud. Value is patient."],
 ["Compound Growth: The Remix That Builds Itself","Compounding is earning returns on your returns. Money left invested remixes itself — small verses early become a stadium chorus later. Time is the loudest amplifier.","Start early. Let time do the heavy lifting."],
 ["Long Game vs. Day Trading","Investors hold for years; day traders flip in hours. Day trading is the freestyle battle — fast, risky, most rookies lose. The long game built nearly every fortune in this game's history cards.","Slow money built the empires. Fast money built the cautionary tales."],
 ["Stop-Loss: Your Exit Plan","A stop-loss is a price where you sell automatically to cap a loss. Pros decide their exit before they enter — like knowing where the fire exit is before the show starts.","Decide your exit before your entry."],
 ["Building a Portfolio","A portfolio is your full lineup: some steady headliners, some rising openers, cash on the bench. Balance is what survives every season.","Build a lineup, not a lottery ticket."],
 ["BOSS: Portfolio Manager","Boss level. Volatile chart, real target. Manage position size like a manager manages a roster.","Your cash is a player too. Keep some on the bench."],
 ["Earnings: Report Card Day","Four times a year companies publish earnings — their report card. Beat expectations and stocks often jump; miss, and they drop. The days around earnings are the loudest on the calendar.","Trade the reaction, respect the risk."],
 ["News & Sentiment","Headlines move prices because feelings move buyers. A rumor can spike a chart with zero change in the business. Learn to separate the story from the spreadsheet.","Feelings move first. Facts settle the bill."],
 ["Index Funds: Own the Whole Chart","An index fund holds every company in a list like the S&P 500 — the whole Billboard chart in one buy. It's the strategy most pros quietly recommend to family.","Owning the chart beats guessing the hit."],
 ["Budget First, Invest Second","Investing starts before the app: spend less than you make, stack an emergency fund, then invest the surplus. The first investment is always in your own stability.","No portfolio survives a broken budget."],
 ["BOSS: The Come-Up Final","The Act I final. Beat this boss and the gate to 75 more levels swings open. Everything you've learned is on this chart.","This is the gate. Take it."]
];
var ADVANCED=[
 ["Moving Averages: The Smooth Beat","A moving average smooths price into a line. Price above the line = uptrend energy; below = the beat is dragging. Crossovers are classic entry and exit signals.","Let the average filter the noise."],
 ["Support & Resistance: Floor and Ceiling","Support is a floor where buyers keep stepping in; resistance is a ceiling where sellers push back. Breakouts through either one start new verses.","Buy the floor. Respect the ceiling."],
 ["RSI: Is It Overhyped?","The Relative Strength Index scores momentum 0–100. Above 70, a stock may be overbought — the crowd is overheated. Below 30, it may be oversold and due a bounce.","Overheated crowds cool off."],
 ["Market Sectors: Every Crew Has a Lane","Tech, health, energy, banks — sectors move together like crews. When money rotates, whole lanes heat up or cool down together.","Watch which lane the money is entering."],
 ["Short Selling: Betting on the Fall","Short sellers borrow shares, sell high, and hope to buy back lower. It's advanced and dangerous — losses can be unlimited when a stock moons instead.","Advanced move. Unlimited risk. Handle with care."],
 ["Options Basics: Renting the Right","An option is a contract: the right to buy or sell at a set price by a set date. Small money, big leverage, fast expiry — options are the remix contest of markets.","Leverage cuts both ways, fast."],
 ["REITs: Own the Building, Skip the Landlord Life","Real Estate Investment Trusts let you own slices of malls, apartments, and towers through a stock — and they must pay most profits out as dividends.","Property income, stock-market simple."],
 ["Bonds: The Steady Bassline","A bond is a loan you make to a company or government that pays interest back. Slower than stocks, steadier too — the bassline under the portfolio's melody.","Every album needs a bassline."],
 ["Dollar-Cost Averaging: Same Verse, Every Week","Investing the same amount on a schedule buys more shares when prices dip and fewer when they spike — no timing genius required.","Consistency beats timing."],
 ["Taxes & Accounts: Keep What You Earn","Retirement accounts like IRAs and 401(k)s shelter growth from taxes. The account you choose can matter as much as the stock you pick.","It's not what you make. It's what you keep."],
 ["Reading a Balance Sheet","Assets, debts, cash — a balance sheet is the company's medical chart. Strong cash and low debt survive any winter.","Check the vitals before the vocals."],
 ["Moats: What Protects the Empire?","A moat is whatever stops competitors from copying the business — a brand, a network, a patent. Wide moats protect profits for decades.","Back empires with defenses."]
];
var PATTERNS=["Uptrend Anthem","Dip & Bounce","Breakout Verse","Choppy Freestyle","Slow Climb","Hype Spike","Comeback Tour","Sideways Groove"];
var COMPANIES=[["BOOM","BoomBox Audio Co."],["BEAT","BeatWorks Streaming"],["GOLD","GoldChain Records Group"],["VINYL","Vinyl Revival Inc."],["FLOW","FlowState Media"],["MIC","MicDrop Technologies"],["HUSTLE","Hustle Athletics"],["EMPIRE","Empire Estates REIT"],["LEGACY","Legacy Sneaker Co."],["CYPHER","Cypher Cloud Systems"],["BASS","BassLine Energy"],["TEMPO","Tempo Health Group"],["CROWN","Crown Barbers Brands"],["STUDIO","Studio City Films"],["BLOCK","BlockParty Foods"],["TURNTBL","Turntable Toys Inc."]];

/* ============ BLACK AMERICAN HISTORY — one true story per level ============ */
var HISTORY=[
 ["Black Wall Street — Greenwood, Tulsa","In the early 1900s, Greenwood in Tulsa, Oklahoma, was one of the wealthiest Black communities in America — Black-owned banks, hotels, theaters, and hundreds of businesses, built within a generation of emancipation. It was destroyed by a white mob in the 1921 Tulsa Race Massacre, and its wealth was never restored.","Ownership built Greenwood. That's why this game starts with what a share really is."],
 ["Madam C.J. Walker — America's First Self-Made Female Millionaire","Born Sarah Breedlove on a Louisiana plantation in 1867, she built a hair-care empire, employed and trained thousands of Black women as sales agents, and invested her profits in real estate and community causes.","She didn't just sell a product — she built a distribution network. That's a business moat."],
 ["Maggie Lena Walker & St. Luke Penny Savings Bank","In 1903, Maggie Lena Walker became the first Black woman to charter a bank in the U.S., founding St. Luke Penny Savings Bank in Richmond, Virginia, so Black families could save and borrow in their own community.","She turned pennies into a bank. Small deposits, compounded, become capital."],
 ["The Freedman's Savings Bank (1865)","Created for formerly enslaved people and Black Union soldiers, the Freedman's Bank drew over 60,000 depositors in a decade. Its 1874 collapse — after mismanagement by others — cost families millions and taught a hard lesson about oversight.","Trust, but verify who holds the money. That's risk management, 1874 edition."],
 ["North Carolina Mutual — The Largest Black Business of Its Era","Founded in Durham in 1898, North Carolina Mutual became the largest Black-owned business in America for much of the 20th century, selling life insurance on Durham's own 'Black Wall Street' on Parrish Street.","Insurance, savings, investment — Durham built the full financial stack."],
 ["Berry Gordy & Motown — Ownership of the Masters","Berry Gordy borrowed $800 from his family in 1959 and built Motown Records — and crucially, he kept ownership of the company and its publishing for decades before selling on his own terms.","Gordy understood equity: own the company, not just the royalties."],
 ["Jay-Z — From Records to Equity","Jay-Z's biggest wins weren't album sales: equity stakes in champagne, cognac, tech, and art, plus owning his masters. He famously turned brand mentions into ownership deals instead of endorsement checks.","'I'm not a businessman, I'm a business' — that's a P/E ratio mindset: own the earnings."],
 ["Master P & No Limit — The 85/15 Deal","Master P turned down a $1 million advance and negotiated a distribution deal where he kept the overwhelming share and owned his masters — then built No Limit into a fortune estimated in the hundreds of millions.","He chose equity over a signing bonus. Ownership beats a paycheck."],
 ["Nipsey Hussle — Buy Back the Block","Nipsey Hussle bought the Crenshaw plaza where his Marathon Clothing store stood, invested in local real estate and tech education, and preached ownership to his neighborhood until his death in 2019.","His marathon was a portfolio: music, property, and community equity, held long-term."],
 ["Robert F. Smith — Private Equity's Heavyweight","Robert F. Smith founded Vista Equity Partners in 2000 and became one of America's wealthiest people by buying and improving software companies — buying businesses, not just stocks.","Public stocks are one arena. Owning whole companies is the next level up."],
 ["John W. Rogers Jr. & Ariel Investments","In 1983, at just 24, John Rogers founded Ariel Investments — the first Black-owned mutual fund company in the U.S. His patient, value-investing style was inspired by his family's discipline about money.","A mutual fund from a 24-year-old: start early, invest patiently, compound quietly."],
 ["OneUnited Bank — Banking the Community","Formed from the merger of historic Black-owned banks, OneUnited is one of the largest Black-owned banks in America, built on the idea that community deposits should fund community loans.","Where your money sleeps at night matters. Banks lend out deposits — choose the lender."],
 ["Oprah Winfrey — Equity Over Salary","Oprah negotiated ownership of The Oprah Winfrey Show through Harpo Productions, turning a talk show into a media empire — then famously bought a major stake in Weight Watchers in 2015 and multiplied it.","Salary caps out. Equity doesn't. She bought the company, not just the commercial."],
 ["Reginald Lewis — The Billion-Dollar Deal","In 1987, Reginald Lewis engineered a $985 million buyout of Beatrice International Foods — the largest business deal by a Black American at the time — building on a Harvard Law education and relentless deal-making.","He studied the market's rulebook, then used it: leverage, timing, and preparation."],
 ["A.G. Gaston — Birmingham's Builder","Arthur George Gaston built a Birmingham empire — insurance, a bank, a motel, radio — starting from a lunchbox savings habit, and quietly funded civil rights efforts, including support around the 1963 Birmingham campaign.","Savings first, empire second, community always. Budget before investing isn't new."],
 ["Russell Simmons & Def Jam — Building the Label","Russell Simmons co-founded Def Jam Recordings and later built fashion and finance ventures — including RushCard, aimed at banking access for underserved communities.","He sold culture, then tried to sell access to the financial system itself."],
 ["Queen Latifah — Flavor Unit Economics","Queen Latifah co-founded Flavor Unit Entertainment, managing artists and producing film and TV — moving from performer to owner of the production company early in her career.","The performer gets paid per show. The owner gets paid per everything."],
 ["Tyler Perry — Owning the Studio","Tyler Perry built his own 330-acre studio in Atlanta on a former Confederate army base — one of the largest studios in America, fully owned — after years of owning his plays, films, and audience outright.","He skipped the gatekeepers and bought the gate. Vertical ownership, start to finish."],
 ["The Johnson Publishing Empire","John H. Johnson built Ebony and Jet magazines into Johnson Publishing, becoming one of the first Black Americans on the Forbes 400 — financed in part by a $500 loan secured by his mother's furniture.","A $500 loan, compounded by ownership for 60 years. That's the long game."],
 ["Daymond John — Start With What You Have","Daymond John started FUBU from his mother's house in Queens, sewing hats and mortgaging the home for capital, then turned it into a global fashion brand before becoming an investor on Shark Tank.","Bootstrap, reinvest profits, repeat. Compounding works on businesses too."],
 ["Bronzeville — Chicago's Black Metropolis","In early-1900s Chicago, Bronzeville's Black entrepreneurs built banks, insurance firms, and the Chicago Defender newspaper empire, while Jesse Binga founded one of the era's major Black-owned banks.","A whole economy in a few square miles — diversification at community scale."],
 ["Katherine Dunham to Katherine Johnson — Skill as Capital","Before modern markets opened to everyone, Black Americans invested in the one asset no one could redline: skill. Katherine Johnson's calculations put Americans in orbit — human capital that compounded for a lifetime.","Your first portfolio is your skills. Education is the original investment."],
 ["The Montgomery Bus Boycott — Economics as Power","For 381 days in 1955–56, Montgomery's Black community boycotted segregated buses, organizing carpools and redirecting their dollars — a masterclass in collective economic leverage that helped change the law.","Money moves markets, and movements. Sentiment isn't just for stocks."],
 ["Freedom National Bank of Harlem (1964)","Founded in Harlem with investors including Jackie Robinson on its board, Freedom National Bank served a community mainstream banks ignored, growing into one of the largest Black-owned banks of its era.","Jackie Robinson broke barriers on the field — then sat on a bank board. Ownership everywhere."],
 ["Sean Combs & Bad Boy — Brand as an Asset","Sean Combs built Bad Boy Records, then Sean John fashion and major beverage partnerships — showing how a personal brand, treated as an asset, can be licensed, partnered, and sold across industries.","A brand is an intangible asset. On a balance sheet, it can be the biggest line."],
 ["Rihanna & Fenty — Equity in the Empire","Rihanna's Fenty Beauty stake — built as a real ownership partnership with LVMH rather than a simple endorsement — made her a billionaire, powered by a product line launched for every skin tone.","Inclusion was the market insight; equity was the payday."],
 ["LeBron James — The Equity Playbook","LeBron James turned salary into stakes: a famous early equity deal instead of a sneaker bonus structure, ownership in production and food brands, and a stake in Fenway Sports Group.","He stopped asking 'how much per year?' and started asking 'how much of the company?'"],
 ["Michael Jordan — The Licensing Legend","Jordan's Nike partnership created the Jordan Brand, a multi-billion-dollar business within Nike, and his majority ownership of the Charlotte Hornets turned the player into the owner.","From earning on the court to owning the team. That's the full ladder of equity."],
 ["Annie Malone — The Original Hair-Care Pioneer","Before Madam C.J. Walker, Annie Malone built Poro, a hair-care empire in St. Louis, employing thousands and funding colleges and orphanages. Walker herself once worked as a Poro sales agent.","Every empire has a mentor chain. Learn from the level before yours."],
 ["Charles Clinton Spaulding — The Quiet Actuary","C.C. Spaulding helped run North Carolina Mutual for decades with actuarial discipline — pricing risk carefully, surviving the Great Depression when many insurers failed.","Risk priced honestly survives crashes. That's the stop-loss mindset, institutional edition."],
 ["Hip Hop's First Business Lesson — Sugar Hill","The Sugarhill Gang's 'Rapper's Delight' (1979) put hip hop on the charts — but the artists saw little of the money while the label owned the record. The industry learned the ownership lesson the hard way, in public.","Read the contract. Own the masters. The first lesson of the culture was financial."],
 ["Dr. Dre & Beats — Selling the Headphones Empire","Dr. Dre and Jimmy Iovine built Beats headphones into a brand Apple bought for $3 billion in 2014 — at the time Apple's largest acquisition — turning a producer's ear into an equity exit.","He didn't sell songs. He sold a company. Exits are a strategy too."],
 ["50 Cent & Vitamin Water — The Stake, Not the Fee","50 Cent took equity in Vitamin Water instead of just an endorsement fee; when Coca-Cola bought the parent company for $4.1 billion in 2007, his stake paid many times what a commercial would have.","Fee = one paycheck. Stake = a share of the sale. Always ask for the stake."],
 ["Black-Owned Banks Today","There are roughly two dozen Black-owned banks in the U.S. today, holding a small share of national banking assets — which is exactly why their founders' stories fill this game: the lane is historic, and still wide open.","The history isn't finished. Neither is the opportunity."],
 ["The Chicago Defender & Robert Abbott","Robert S. Abbott founded the Chicago Defender in 1905 with 25 cents and built it into the most influential Black newspaper in America, shaping the Great Migration itself.","He invested 25 cents in information. Information advantage is a real market edge."],
 ["Wall Street's Own — Travers Bell & Daniels; Bell","In 1971, Travers Bell co-founded Daniels & Bell, the first Black-owned member firm of the New York Stock Exchange — buying a seat at the table where the game itself is run.","From trading stocks to owning a seat on the exchange: every level of the ladder exists."],
 ["Suzanne Shank — Wall Street Power Broker","Suzanne Shank co-founded Siebert Cisneros Shank, which became one of the top municipal-bond firms in America, helping finance the roads, schools, and airports everyone uses.","Bonds finance the world quietly. Somebody owns that bassline — it can be you."],
 ["Eddie Brown & Brown Capital","Eddie C. Brown founded Brown Capital Management in Baltimore in 1983; it grew into one of the largest Black-owned asset managers in the country, running billions with a patient growth philosophy.","Patience, research, decades. The tortoise runs a fund."],
 ["Carla Harris — Morgan Stanley's Vice Chair","Carla Harris spent three decades at Morgan Stanley, becoming a vice chair and a leading voice on sponsorship and capital access — while singing gospel on the side.","Capital access is a network game. Build the network like you build the portfolio."],
 ["Run-DMC × Adidas — The First Sneaker Deal (1986)","Run-DMC's 'My Adidas' was an unpaid love letter to their shell-toes — until they held a shoe up at a packed concert in front of Adidas executives and turned it into a million-dollar endorsement deal, the first of its kind in hip hop. The culture had the audience; the deal turned that audience into a payday.","Attention is an asset. In '86, three MCs from Hollis, Queens proved you can charge for it."],
 ["DJ Kool Herc — The Birth of Hip Hop (1973)","On August 11, 1973, Cindy Campbell threw a back-to-school party in the rec room at 1520 Sedgwick Avenue in the Bronx, and her brother DJ Kool Herc played the breakbeats — the funkiest seconds of each record, looped over and over so the dancers could keep moving. That party is where hip hop started: two turntables, a microphone, and a room full of people.","Every empire starts as a party in a rec room. Start where you are, with what you have."],
 ["Grandmaster Flash — The Turntable Becomes an Instrument","Grandmaster Flash took Herc's idea and turned the turntable into an instrument — cutting, scratching, and mixing records live so precisely that the DJ became the star of the show. His group, Grandmaster Flash and the Furious Five, put 'The Message' on the radio in 1982 — rap that told the truth about the streets.","Master the tools in front of you until they do something nobody has heard before."],
 ["Public Enemy & N.W.A. — The Golden Age Finds Its Voice","In the late 1980s, hip hop's golden age turned the microphone into a megaphone. Public Enemy's 'It Takes a Nation of Millions to Hold Us Back' (1988) and N.W.A.'s 'Straight Outta Compton' (1988) sold millions by saying what the news wouldn't — and proved an honest voice could move a market of its own.","A clear voice, owned outright, is worth more than a borrowed one."],
 ["Outkast & the South — Hip Hop Goes Nationwide","When Outkast took the stage in New York in 1995, André 3000 told the crowd 'the South got something to say' — and then the South said it for the next two decades, from Atlanta's trap sound to a whole new generation of stars. Hip hop stopped belonging to one coast and became the whole country's music.","New voices open new markets. The next big thing rarely comes from the center."],
 ["Kendrick Lamar — The Pulitzer (2018)","In 2018, Kendrick Lamar's album DAMN. won the Pulitzer Prize for Music — the first time the prize ever went to a hip-hop artist, or to any music outside classical and jazz. The culture that started at a Bronx rec-room party was now, officially, American literature.","The work speaks. Make it undeniable and the world catches up."],
 ["The Next Chapter Is Yours","Every fortune in these cards started as a lesson somebody decided to take seriously — a savings habit, a contract read twice, a stake instead of a fee. The market's history is still being written.","Level by level, that's what you're doing here: learning the rules well enough to own something."]
];

function lessonFor(n){
  var isBoss=(n%5===0);
  var base, title;
  if(n<=25){ base=CORE[n-1]; }
  else{
    var adv=ADVANCED[(n-26)%ADVANCED.length];
    var cycle=Math.floor((n-26)/ADVANCED.length)+1;
    base=[adv[0], adv[1]+" (Mastery round "+cycle+": the same idea, a harder chart, a bigger target — pros revisit fundamentals at higher stakes.)", adv[2]];
  }
  title=base[0];
  return {title:title, body:base[1], tip:base[2], isBoss:isBoss, hist:HISTORY[(n-1)%HISTORY.length]};
}
function levelName(n){
  var L=lessonFor(n);
  if(L.isBoss) return "👑 BOSS — "+L.title.replace(/^BOSS:\s*/,"");
  return L.title;
}
var ACTS=[
 {from:1,to:25,name:"Act I — The Come Up",tag:"the first 25 · learn the game",desc:"The basics: what a stock is, how charts move, how dividends and compounding pay you. Finish level 25 and the gate to the next 75 levels swings open."},
 {from:26,to:100,name:"Act II — The Empire Run",tag:"75 more levels · gate opens at 25",desc:"Advanced technique: indicators, sectors, options, REITs, bonds, balance sheets — at higher targets and wilder charts. Clear level 100 to trigger the final gateway."},
 {from:101,to:200,name:"Act III — The Legacy Vault",tag:"final 100 levels · gate opens at 100",desc:"Mastery rounds at mogul difficulty: every idea in the game, remixed at the highest stakes. Finish 200 and you've run the full cypher — from first share to legacy."}
];
var BOSSES=[["👑","Baron Von Bear","You trade feelings. I trade fear. Beat my target — if your hands don't shake."],
 ["🎩","Madame Short-Sell","Darling, I profit when prices fall. Your little uptrend doesn't scare me."],
 ["🦈","Kangol Kenny","I've seen a thousand rookies buy the top. Show me you're not one of them."],
 ["🎭","The Hype Man","EVERYTHING'S GOING TO THE MOON! ...What? You want fundamentals? Ugh. Fine."],
 ["💎","Gold Chain G","I never sell. NEVER. Out-earn my portfolio without flinching. I dare you."]];
var NEWS_UP=["Earnings just crushed expectations — the crowd is rushing in.","A major artist signed an endorsement deal with the brand. Socials are buzzing.","Analysts upgraded the stock this morning: 'undervalued gem.'","New product launch is trending nationwide."];
var NEWS_DOWN=["A rival just dropped a competing product. Traders are nervous.","Supply problems hit the news — shipments are delayed.","An analyst downgraded the stock, questioning its price.","Market-wide selloff is dragging even good companies down."];
var NEWS_FLAT=["Quiet day for the company — no major headlines.","Traders are waiting on next week's announcement.","The stock is drifting while the crowd watches bigger names."];

/* ============ DIFFICULTY FROM PROFILE ============ */
function difficulty(p){
  if(p.age==="little") return {label:"Little Legends", vol:0.45, targetBonus:-0.02, coach:true, days:24};
  if(p.skill==="mogul") return {label:"Mogul", vol:1.5, targetBonus:0.10, coach:false, days:16};
  if(p.skill==="hustler") return {label:"Hustler", vol:1.15, targetBonus:0.04, coach:true, days:18};
  var d={label:"Rookie", vol:0.8, targetBonus:0, coach:true, days:20};
  if(p.age==="kid"){ d.vol=0.6; d.days=22; d.label="Rookie · Kid Mode"; }
  return d;
}

/* ============ STATE (this session only — nothing is uploaded or saved) ============ */
var state={profiles:[], current:null, progress:{}, xp:0, wallets:{}};
var sel={face:"🎤", age:"teen", skill:"rookie"};

/* ============ OWNERS ANALYTICS (session only, counted live) ============ */
var OWNER={loggedIn:false,user:null,userName:null,ownerId:null,passcode:null,returnTo:"door",pulse:128,pulseTimer:null};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
var ANALYTICS=null;
function freshAnalytics(){return {startedAt:Date.now(),events:[],profilesCreated:0,logins:0,levelStarts:0,levelClears:0,levelFails:0,bossStarts:0,bossClears:0,bossFails:0,deposits:0,withdrawals:0,depositVol:0,withdrawVol:0,liveBuys:0,liveSells:0,errors:0,views:{door:0,map:0,live:0,wallet:0,level:0,owner:0}};}
ANALYTICS=freshAnalytics();
function track(type,detail){
  if(!ANALYTICS) return;
  var now=new Date();
  ANALYTICS.events.unshift({t:now.getTime(),time:now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"}),type:type,detail:detail||""});
  if(ANALYTICS.events.length>300) ANALYTICS.events.pop();
  if(type==="screen_view"&&detail){var key=String(detail).toLowerCase().split(" ")[0]; if(ANALYTICS.views.hasOwnProperty(key)) ANALYTICS.views[key]++;}
  if(type==="profile_created") ANALYTICS.profilesCreated++;
  if(type==="profile_login") ANALYTICS.logins++;
  if(type==="level_start"){ANALYTICS.levelStarts++; if(/boss/i.test(detail||"")) ANALYTICS.bossStarts++;}
  if(type==="level_clear"){ANALYTICS.levelClears++; if(/boss/i.test(detail||"")) ANALYTICS.bossClears++;}
  if(type==="level_fail"){ANALYTICS.levelFails++; if(/boss/i.test(detail||"")) ANALYTICS.bossFails++;}
  if(type==="wallet_deposit"){ANALYTICS.deposits++; ANALYTICS.depositVol+=Number((detail||"").replace(/[^0-9.]/g,""))||0;}
  if(type==="wallet_withdraw"){ANALYTICS.withdrawals++; ANALYTICS.withdrawVol+=Number((detail||"").replace(/[^0-9.]/g,""))||0;}
  if(type==="live_buy") ANALYTICS.liveBuys++;
  if(type==="live_sell") ANALYTICS.liveSells++;
  if(type==="blocked"||type==="error") ANALYTICS.errors++;
  if(OWNER.loggedIn&&!$("owner-dashboard").hidden) renderOwnerDashboard();
}
function totalViews(){return Object.keys(ANALYTICS.views).reduce(function(s,k){return s+ANALYTICS.views[k];},0);}

function $(id){return document.getElementById(id);}
function money(n){return "$"+Math.round(n).toLocaleString("en-US");}

/* ---------- Front door ---------- */
$("tab-create").addEventListener("click",function(){showTab(true);});
$("tab-login").addEventListener("click",function(){showTab(false);});
function showTab(create){
  $("tab-create").setAttribute("aria-pressed",create); $("tab-login").setAttribute("aria-pressed",!create);
  $("form-create").hidden=!create; $("form-login").hidden=create;
  if(!create) refreshLoginList();
}
function refreshLoginList(){
  var s=$("f-login"); s.innerHTML="";
  if(!state.profiles.length){var o=document.createElement("option");o.textContent="No profiles yet — create one first";o.value="";s.appendChild(o);return;}
  state.profiles.forEach(function(p,i){var o=document.createElement("option");o.value=i;o.textContent=p.face+" "+p.name+" · "+difficulty(p).label;s.appendChild(o);});
}
document.querySelectorAll("#avatars .avatar-btn").forEach(function(b){b.addEventListener("click",function(){
  document.querySelectorAll("#avatars .avatar-btn").forEach(function(x){x.setAttribute("aria-pressed","false");});
  b.setAttribute("aria-pressed","true"); sel.face=b.getAttribute("data-face");
});});
document.querySelectorAll("#seg-age button").forEach(function(b){b.addEventListener("click",function(){
  document.querySelectorAll("#seg-age button").forEach(function(x){x.setAttribute("aria-pressed","false");});
  b.setAttribute("aria-pressed","true"); sel.age=b.getAttribute("data-age");
});});
document.querySelectorAll("#seg-skill button").forEach(function(b){b.addEventListener("click",function(){
  document.querySelectorAll("#seg-skill button").forEach(function(x){x.setAttribute("aria-pressed","false");});
  b.setAttribute("aria-pressed","true"); sel.skill=b.getAttribute("data-skill");
});});
$("form-create").addEventListener("submit",function(e){
  e.preventDefault();
  var name=$("f-name").value.trim(); var err=$("err-create");
  if(name.length<2){err.style.display="block";err.textContent="Drop a real stage name — at least 2 characters.";return;}
  err.style.display="none";
  var p={name:name,face:sel.face,age:sel.age,skill:sel.skill};
  state.profiles.push(p); track("profile_created",p.face+" "+p.name+" · "+difficulty(p).label); enterGame(p);
});
$("form-login").addEventListener("submit",function(e){
  e.preventDefault(); var err=$("err-login");
  var v=$("f-login").value;
  if(v===""||!state.profiles[Number(v)]){err.style.display="block";err.textContent="No profile selected yet — create one first, then log in.";return;}
  err.style.display="none"; track("profile_login",state.profiles[Number(v)].name); enterGame(state.profiles[Number(v)]);
});
$("btn-logout").addEventListener("click",function(){
  state.current=null; $("screen-app").style.display="none"; $("screen-level").style.display="none"; $("screen-door").style.display="flex"; refreshLoginList();
});

/* ---------- Map ---------- */
function completedCount(){return Object.keys(state.progress).length;}
function enterGame(p){
  state.current=p; track("screen_view","map — entered game as "+p.name);
  if(!state.progress[p.name]) state.progress[p.name]={};
  ensureWallet();
  $("screen-door").style.display="none"; $("screen-level").style.display="none"; $("screen-app").style.display="block";
  showAppView("map"); renderMap(); window.scrollTo(0,0);
}
function prog(){return state.progress[state.current.name]||{};}
function highestDone(){var ks=Object.keys(prog()).map(Number);return ks.length?Math.max.apply(null,ks):0;}
function renderMap(){
  var p=state.current, d=difficulty(p), done=highestDone(), total=completedCountAll();
  $("p-face").textContent=p.face; $("p-name").textContent=p.name;
  $("p-meta").textContent=(p.age==="little"?"Little Legend · ages 4–7 · grown-up co-pilot":p.age==="kid"?"Kid trader · ages 8–12":p.age==="teen"?"Teen trader · ages 13–17":"Adult trader · 18+")+" · Difficulty: "+d.label+" · Coach "+(d.coach?"on":"off")+" · Charts: "+(d.vol<=0.5?"gentlest":d.vol<=0.8?"calm":d.vol<=1.15?"real swings":"wild");
  $("hud-xp").textContent="⭐ "+state.xp+" XP";
  $("hud-level").textContent="Cleared "+total+" / 200";
  $("p-bar").style.width=(total/200*100)+"%";
  $("p-next").textContent= total>=200 ? "🏆 Full cypher complete — 200 of 200. Legacy status." :
    done<25 ? "Next gate: clear Level 25 to open 75 more levels ("+(25-done)+" to go)." :
    done<100 ? "Act II is open. Clear Level 100 to trigger the final 100 levels ("+(100-done)+" to go)." :
    "Legacy Vault is open. "+(200-done)+" levels between you and the crown.";
  var html="";
  ACTS.forEach(function(act){
    var unlocked = act.from===1 || highestDone()>=act.from-1;
    html+='<section class="act"><div class="act-head"><h2>'+act.name+'</h2><span class="marker">'+act.tag+'</span></div><p class="desc">'+act.desc+'</p>';
    if(!unlocked){
      html+='<div class="gate">🔒 <b>Gate locked.</b><span>Clear Level '+(act.from-1)+' to open these levels.</span></div>';
    } else {
      if(act.from>1) html+='<div class="gate open">🔓 <b>Gateway open!</b><span>You cleared Level '+(act.from-1)+' — these levels are yours.</span></div>';
      html+='<div class="levels">';
      for(var n=act.from;n<=act.to;n++){
        var pr=prog()[n], isDone=!!pr, isNext=(n===done+1), locked=(n>done+1);
        var cls="level-btn"+(lessonFor(n).isBoss?" boss":"")+(isDone?" done":"")+(locked?" locked":"")+(isNext?" next":"");
        html+='<button type="button" class="'+cls+'" data-level="'+n+'" '+(locked?"disabled":"")+'><small>Level '+n+(lessonFor(n).isBoss?" · BOSS":"")+'</small><b>'+levelName(n).replace(/^👑 BOSS — /,"")+'</b><span class="stars">'+(isDone?"★".repeat(pr.stars)+"☆".repeat(3-pr.stars):(locked?"🔒 Locked":"▶ Play"))+'</span></button>';
      }
      html+='</div>';
    }
    html+='</section>';
  });
  $("acts").innerHTML=html;
  document.querySelectorAll(".level-btn[data-level]").forEach(function(b){b.addEventListener("click",function(){startLevel(Number(b.getAttribute("data-level")));});});
  syncWalletUI(); updateLiveGate();
}
function completedCountAll(){return Object.keys(prog()).length;}
function allLevelsDone(){return completedCountAll()>=200;}

/* ---------- App views: Map / Live Trading / Wallet ---------- */
function showAppView(v){
  track("screen_view",v+(state.current?" — "+state.current.name:""));
  ["map","live","wallet"].forEach(function(k){
    var el=$("view-"+k); if(el) el.hidden=(k!==v);
    var btn=document.querySelector('.app-tabs button[data-view="'+k+'"]'); if(btn) btn.setAttribute("aria-pressed", k===v?"true":"false");
  });
  if(v==="live"){ updateLiveGate(); if(allLevelsDone()){ initLiveMarket(); renderLive(); } }
  if(v==="wallet"){ syncWalletUI(); }
  window.scrollTo(0,0);
}
document.querySelectorAll(".app-tabs button").forEach(function(b){b.addEventListener("click",function(){showAppView(b.getAttribute("data-view"));});});
$("btn-wallet-shortcut").addEventListener("click",function(){showAppView("wallet");});
$("btn-back-to-map").addEventListener("click",function(){showAppView("map");});
$("btn-live-wallet").addEventListener("click",function(){showAppView("wallet");});

/* ---------- Wallet (in the profile, session only, play funds) ---------- */
function ensureWallet(){
  if(!state.current) return {balance:0,holdings:{},tx:[]};
  if(!state.wallets[state.current.name]) state.wallets[state.current.name]={balance:0,holdings:{},tx:[]};
  return state.wallets[state.current.name];
}
function money2(n){return "$"+Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",");}
function holdingsValue(){
  var w=ensureWallet(), total=0;
  Object.keys(w.holdings).forEach(function(sym){ var s=liveStock(sym); if(s) total+=w.holdings[sym]*s.price; });
  return total;
}
function walletMsg(text,ok){
  var m=$("wallet-msg"); m.textContent=text; m.className="msg "+(ok?"ok":"bad");
}
function pushTx(label,amt){
  var w=ensureWallet();
  w.tx.unshift({label:label,amt:amt,bal:w.balance,when:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})});
  if(w.tx.length>30) w.tx.pop();
}
function syncWalletUI(){
  if(!state.current) return;
  var w=ensureWallet(), hv=holdingsValue(), nw=w.balance+hv, total=completedCountAll(), d=difficulty(state.current);
  $("wallet-mini-bal").textContent=money2(w.balance);
  $("wallet-mini-note").textContent= allLevelsDone() ? "Live desk is open — trade it from the Live Trading tab." : "Fund it now, trade it when all 200 levels are done ("+total+"/200).";
  $("w-name").textContent=state.current.face+" "+state.current.name;
  $("w-meta").textContent=(state.current.age==="little"?"Little Legend · ages 4–7":state.current.age==="kid"?"Kid trader · ages 8–12":state.current.age==="teen"?"Teen trader · ages 13–17":"Adult trader · 18+")+" · Difficulty: "+d.label+" · ⭐ "+state.xp+" XP";
  $("w-progress").textContent= total>=200 ? "🏆 All 200 levels cleared — Live Trading unlocked." : "Levels cleared: "+total+" of 200 · Live Trading unlocks at 200.";
  $("w-bar").style.width=(total/200*100)+"%";
  $("w-bal").textContent=money2(w.balance);
  $("w-holdings-line").textContent="Holdings: "+money2(hv)+" · Net worth: "+money2(nw);
  var lv=$("live-wallet-bal"); if(lv) lv.textContent=money2(w.balance);
  var h=$("wallet-history");
  if(!w.tx.length){ h.innerHTML='<div><span>No wallet moves yet.</span><span>Add money above to get started.</span></div>'; }
  else{ h.innerHTML=w.tx.map(function(t){return '<div><span>'+t.label+' · '+t.when+'</span><span><b>'+(t.amt>=0?"+":"−")+money2(Math.abs(t.amt)).slice(0)+'</b> · Bal '+money2(t.bal)+'</span></div>';}).join(""); }
  updateLiveGate();
}
function updateLiveGate(){
  if(!state.current) return;
  var total=completedCountAll(), done=allLevelsDone(), w=ensureWallet();
  var badge=$("live-tab-badge");
  badge.textContent= done ? "🔓 Open" : "🔒 "+total+"/200";
  badge.className="badge"+(done?" open":"");
  var setReq=function(id,ok,label){ var el=$(id); if(!el) return; el.className=ok?"done":""; el.textContent=(ok?"✅ ":"⬜ ")+label; };
  setReq("req-act1", highestDone()>=25, "Clear Act I — Levels 1–25");
  setReq("req-act2", highestDone()>=100, "Clear Act II — Levels 26–100");
  setReq("req-act3", total>=200, "Clear Act III — Levels 101–200");
  setReq("req-wallet", w.balance>0||Object.keys(w.holdings).length>0, "Fund your wallet in Wallet & Profile");
  var bar=$("live-gate-bar"); if(bar) bar.style.width=(total/200*100)+"%";
  var gt=$("live-gate-text"); if(gt) gt.textContent= done ? "🏆 All 200 levels cleared — the Live desk is open below." : total+" of 200 levels cleared · "+(200-total)+" to go before Live Trading opens.";
  var lk=$("live-locked"), dk=$("live-desk");
  if(lk&&dk){ lk.hidden=done; dk.hidden=!done; }
}
document.querySelectorAll(".preset-row button").forEach(function(b){b.addEventListener("click",function(){
  var row=b.parentElement, inp=$(row.getAttribute("data-target")); if(inp) inp.value=b.getAttribute("data-amt");
});});
$("btn-add-funds").addEventListener("click",function(){
  var amt=Math.floor(Number($("add-amt").value));
  if(!amt||amt<1||amt>100000){ walletMsg("Enter an amount between $1 and $100,000 to add.",false); return; }
  var w=ensureWallet(); w.balance+=amt; pushTx("➕ Added to wallet",amt); track("wallet_deposit","+"+money2(amt)+" — "+(state.current?state.current.name:""));
  walletMsg("Added "+money2(amt)+" to your wallet. New balance: "+money2(w.balance)+".",true); syncWalletUI();
});
$("btn-withdraw").addEventListener("click",function(){
  var amt=Math.floor(Number($("wd-amt").value)), w=ensureWallet();
  if(!amt||amt<1){ walletMsg("Enter at least $1 to withdraw.",false); return; }
  if(amt>w.balance){ walletMsg("You only have "+money2(w.balance)+" in the wallet — sell shares first if your money is in holdings, or withdraw less.",false); return; }
  w.balance-=amt; pushTx("➖ Withdrew from wallet",-amt); track("wallet_withdraw","-"+money2(amt)+" — "+(state.current?state.current.name:""));
  walletMsg("Withdrew "+money2(amt)+". New wallet balance: "+money2(w.balance)+".",true); syncWalletUI();
});

/* ---------- Live Trading desk (simulated live market, play funds) ---------- */
var LIVE=null, liveQty=5, liveTimer=null;
function initLiveMarket(){
  if(LIVE) return;
  var r=rng(20261119);
  LIVE=COMPANIES.slice(0,8).map(function(c,i){
    var start=Math.round((12+r()*160)*100)/100;
    return {sym:c[0],name:c[1],price:start,open:start,hist:[start]};
  });
  LIVE.sel=LIVE[0].sym;
  liveTimer=setInterval(tickLive,2500);
}
function liveStock(sym){ if(!LIVE) return null; for(var i=0;i<LIVE.length;i++){ if(LIVE[i].sym===sym) return LIVE[i]; } return null; }
function tickLive(){
  if(!LIVE||!allLevelsDone()) return;
  LIVE.forEach(function(s){
    var move=(Math.random()-0.48)*0.022;
    s.price=Math.max(1,Math.round(s.price*(1+move)*100)/100);
    s.hist.push(s.price); if(s.hist.length>40) s.hist.shift();
  });
  if(!$("view-live").hidden) renderLive();
  syncWalletUI();
}
function liveMsg(text,ok){ var m=$("live-msg"); m.textContent=text; m.className="msg "+(ok?"ok":"bad"); }
function liveLog(t){ var d=document.createElement("div"); d.textContent=t; $("live-log").prepend(d); }
function renderLive(){
  if(!LIVE) return;
  var w=ensureWallet(), sel=liveStock(LIVE.sel)||LIVE[0];
  $("live-stocks").innerHTML=LIVE.map(function(s){
    var chg=(s.price-s.open)/s.open*100, held=w.holdings[s.sym]||0;
    return '<button type="button" class="stock-btn" data-sym="'+s.sym+'" aria-pressed="'+(s.sym===sel.sym)+'"><b>'+s.sym+'</b><span>'+s.name+'</span><br/><span class="chg '+(chg>=0?"up-t":"down-t")+'">$'+s.price.toFixed(2)+' · '+(chg>=0?"+":"")+chg.toFixed(1)+'%</span>'+(held?'<br/><span style="font-weight:800;font-size:12.5px">You own '+held+'</span>':"")+'</button>';
  }).join("");
  document.querySelectorAll("#live-stocks .stock-btn").forEach(function(b){b.addEventListener("click",function(){LIVE.sel=b.getAttribute("data-sym");renderLive();});});
  var chg2=(sel.price-sel.open)/sel.open*100;
  $("lt-sym").textContent=sel.sym; $("lt-name").textContent=sel.name+" · Simulated live price — play funds only";
  var pe=$("lt-price"); pe.textContent="$"+sel.price.toFixed(2); pe.className="price "+(sel.price>=sel.open?"up":"down");
  $("lt-change").textContent=(chg2>=0?"+":"")+chg2.toFixed(1)+"% since the desk opened · updates every few seconds";
  $("lt-cash").textContent=money(w.balance); $("lt-shares").textContent=w.holdings[sel.sym]||0;
  var hv=holdingsValue(); $("lt-holdval").textContent=money(hv); $("lt-networth").textContent=money(w.balance+hv);
  $("lt-qty-val").textContent=liveQty+" shares"; $("lt-qty-label").textContent="("+liveQty+")";
  $("btn-live-buy").disabled=w.balance<sel.price; $("btn-live-sell").disabled=!(w.holdings[sel.sym]>0);
  var keys=Object.keys(w.holdings).filter(function(k){return w.holdings[k]>0;});
  $("live-holdings").innerHTML= keys.length ? '<table class="hold-table"><tr><th>Stock</th><th>Shares</th><th>Price</th><th>Value</th></tr>'+keys.map(function(k){var s=liveStock(k);return '<tr><td><b>'+k+'</b></td><td>'+w.holdings[k]+'</td><td>$'+(s?s.price.toFixed(2):"—")+'</td><td>'+(s?money2(w.holdings[k]*s.price):"—")+'</td></tr>';}).join("")+'</table>' : '<p style="color:var(--muted)">No shares yet. Pick a stock above, set your quantity, and hit Buy.</p>';
  drawLiveChart(sel);
}
function drawLiveChart(s){
  var c=$("live-chart"); if(!c) return;
  var ctx=c.getContext("2d"), W=c.width, H=c.height;
  var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.clearRect(0,0,W,H);
  var min=Math.min.apply(null,s.hist), max=Math.max.apply(null,s.hist);
  if(max-min<0.01){max+=1;min-=1;}
  var pad=(max-min)*0.15; max+=pad; min-=pad;
  ctx.strokeStyle=dark?"#372E55":"#E3DCCB"; ctx.lineWidth=1;
  for(var i=1;i<4;i++){var y=H*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.beginPath();
  s.hist.forEach(function(pr,i){ var x=s.hist.length===1?20:20+i*(W-40)/Math.max(s.hist.length-1,1); var y=H-18-((pr-min)/(max-min))*(H-36); if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y); });
  ctx.strokeStyle=s.price>=s.open?"#0090B3":"#E6392B"; ctx.lineWidth=3.5; ctx.lineJoin="round"; ctx.stroke();
  ctx.fillStyle=dark?"#FFF6E3":"#16130E"; ctx.font="bold 13px DM Sans";
  ctx.fillText("$"+max.toFixed(0),6,16); ctx.fillText("$"+min.toFixed(0),6,H-6);
}
$("lt-minus").addEventListener("click",function(){liveQty=Math.max(1,liveQty-5);renderLive();});
$("lt-plus").addEventListener("click",function(){liveQty=Math.min(100,liveQty+5);renderLive();});
$("btn-live-buy").addEventListener("click",function(){
  if(!LIVE||!allLevelsDone()) return;
  var s=liveStock(LIVE.sel), w=ensureWallet();
  var buy=Math.min(liveQty,Math.floor(w.balance/s.price));
  if(buy<1){ liveMsg("Not enough wallet cash for even 1 share of "+s.sym+" — add money in the Wallet tab.",false); return; }
  w.balance-=buy*s.price; w.holdings[s.sym]=(w.holdings[s.sym]||0)+buy; pushTx("📈 Bought "+buy+" × "+s.sym,-buy*s.price); track("live_buy",buy+" × "+s.sym+" @ $"+s.price.toFixed(2));
  liveMsg("Bought "+buy+" × "+s.sym+" @ $"+s.price.toFixed(2)+". Wallet: "+money2(w.balance)+".",true);
  liveLog("🟢 LIVE BUY "+buy+" × "+s.sym+" @ $"+s.price.toFixed(2)); renderLive(); syncWalletUI();
});
$("btn-live-sell").addEventListener("click",function(){
  if(!LIVE||!allLevelsDone()) return;
  var s=liveStock(LIVE.sel), w=ensureWallet(), owned=w.holdings[s.sym]||0;
  var sell=Math.min(liveQty,owned);
  if(sell<1){ liveMsg("You don't own any "+s.sym+" to sell.",false); return; }
  w.balance+=sell*s.price; w.holdings[s.sym]=owned-sell; pushTx("📉 Sold "+sell+" × "+s.sym,sell*s.price); track("live_sell",sell+" × "+s.sym+" @ $"+s.price.toFixed(2));
  liveMsg("Sold "+sell+" × "+s.sym+" @ $"+s.price.toFixed(2)+". Wallet: "+money2(w.balance)+".",true);
  liveLog("🔴 LIVE SELL "+sell+" × "+s.sym+" @ $"+s.price.toFixed(2)); renderLive(); syncWalletUI();
});

/* ---------- Level play ---------- */
var G=null;
function startLevel(n){
  var p=state.current, d=difficulty(p), L=lessonFor(n);
  var r=rng(n*7919+ (p.skill==="mogul"?13:p.skill==="hustler"?7:3));
  var comp=pick(r,COMPANIES);
  var pattern=PATTERNS[Math.floor(r()*PATTERNS.length)];
  var startPrice=Math.round((8+r()*180)*100)/100;
  var startCash= (p.age==="kid"||p.age==="little")? 1000 : 1000+Math.min(4000, n*20);
  var tier=Math.floor((n-1)/25);
  var targetPct= 0.06 + n*0.0016 + d.targetBonus + tier*0.03 + (L.isBoss?0.06:0);
  var driftBase = (pattern.indexOf("Uptrend")===0||pattern.indexOf("Climb")>=0||pattern.indexOf("Breakout")===0)? 0.012 : (pattern.indexOf("Hype")===0? 0.02 : 0.004);
  G={n:n, L:L, comp:comp, pattern:pattern, price:startPrice, prices:[startPrice], day:1, maxDays:d.days,
     cash:startCash, shares:0, qty:5, target:Math.round(startCash*(1+targetPct)), vol:d.vol, drift:driftBase,
     r:r, over:false, boss: L.isBoss? BOSSES[(Math.floor(n/5)-1)%BOSSES.length] : null,
     news: pattern.indexOf("Hype")===0? pick(r,NEWS_UP) : (r()>0.5? pick(r,NEWS_UP): pick(r,NEWS_FLAT))};
  track("level_start","Level "+n+(L.isBoss?" · BOSS":"")+" — "+(p?p.name:"")+" · "+L.title);
  track("screen_view","level — Level "+n);
  $("screen-app").style.display="none"; $("screen-level").style.display="block";
  $("lv-chip").textContent="Level "+n+(L.isBoss?" · BOSS":"")+" · "+pattern;
  $("lv-diff").textContent=d.label;
  $("lv-title").textContent="Level "+n+": "+L.title.replace(/^BOSS:\s*/,"");
  $("lv-sub").textContent= L.isBoss? "Boss level — higher target, wilder chart. No pressure. 👑" : "Featuring "+comp[1]+" ("+comp[0]+") · "+pattern;
  $("lesson-title").textContent=L.title; $("lesson-body").textContent=L.body; $("lesson-tip").textContent="💡 Trader's tip: "+L.tip;
  $("hist-title").textContent=L.hist[0]; $("hist-body").textContent=L.hist[1]; $("hist-link").textContent="↳ In this level: "+L.hist[2];
  var bb=$("boss-banner");
  if(G.boss){bb.classList.add("show");$("boss-face").textContent=G.boss[0];$("boss-name").textContent="Boss: "+G.boss[1];$("boss-line").textContent="“"+G.boss[2]+"”";}
  else bb.classList.remove("show");
  $("tk-sym").textContent=comp[0]; $("tk-name").textContent=comp[1]+" · Simulated price — play money only";
  $("news-text").textContent=G.news;
  $("coach").style.display=d.coach?"block":"none";
  $("coach-text").textContent=coachLine();
  $("log").innerHTML=""; logLine("🎤 Level "+n+" started. You have "+money(G.cash)+" and "+G.maxDays+" trading days. Target: "+money(G.target)+".");
  updateTrade(); drawChart(); window.scrollTo(0,0);
}
function coachLine(){
  if(!G) return "";
  if(state.current && state.current.age==="little"){
    if(portfolio()>=G.target) return "You hit the target! 🎉 Tap NEXT DAY to collect your stars, superstar.";
    if(G.day===1) return "Grown-ups: read the lesson out loud together. Little trader — watch the line on the chart. When it climbs up, the price is growing. Tap BUY when you're ready, then NEXT DAY to see what happens!";
    if(G.shares===0) return "You don't own any shares yet. Buying a share means owning one tiny piece of the company — like owning one brick in a big, tall building.";
    if(G.price<G.prices[0]) return "The price went down a little. That happens to every trader — even the greats in the history stories. Stay calm and watch what it does next.";
    return "You're doing great! "+(G.maxDays-G.day+1)+" days left. Keeping some cash saved is smart too — the pros always keep some ready.";
  }
  if(G.day===1) return "This chart is no different from the ones real traders are watching right now — same moves, same decisions. Read the headline, check the lesson, then trust yourself and decide. A small first buy is a smart opening verse.";
  var ch=(G.price-G.prices[0])/G.prices[0];
  if(G.shares===0 && ch>0.03) return "Price is climbing and you own nothing — the beat is playing without you. Consider a starter position.";
  if(G.shares>0 && ch<-0.04) return "You're down on the position. Re-read the lesson: is this a dip in a good story, or a broken one?";
  if(portfolio()>=G.target) return "You're at the target! You can end the level now with Next Day, or hold for a bigger bag and more stars.";
  return "Pace yourself — "+(G.maxDays-G.day+1)+" days left. Cash on the bench is still a position.";
}
function portfolio(){return G.cash + G.shares*G.price;}
function logLine(t){var d=document.createElement("div");d.textContent=t;$("log").prepend(d);}
function updateTrade(){
  $("tk-price").textContent="$"+G.price.toFixed(2);
  var first=G.prices[0], chg=(G.price-first)/first*100;
  var el=$("tk-price"); el.className="price "+(G.price>=first?"up":"down");
  $("tk-change").textContent="Day "+G.day+" of "+G.maxDays+" · "+(chg>=0?"+":"")+chg.toFixed(1)+"% since open";
  $("pf-cash").textContent=money(G.cash); $("pf-shares").textContent=G.shares;
  $("pf-value").textContent=money(portfolio()); $("pf-target").textContent=money(G.target);
  $("qty-val").textContent=G.qty+" shares"; $("qty-label-1").textContent="("+G.qty+")";
  $("btn-buy").disabled=G.over||G.cash<G.price*1; $("btn-sell").disabled=G.over||G.shares===0; $("btn-next").disabled=G.over;
  $("coach-text").textContent=coachLine();
}
function drawChart(){
  var c=$("chart"), ctx=c.getContext("2d"), W=c.width, H=c.height;
  var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.clearRect(0,0,W,H);
  var min=Math.min.apply(null,G.prices), max=Math.max.apply(null,G.prices);
  if(max-min<0.01){max+=1;min-=1;}
  var pad=(max-min)*0.15; max+=pad; min-=pad;
  ctx.strokeStyle=dark?"#372E55":"#E3DCCB"; ctx.lineWidth=1;
  for(var i=1;i<4;i++){var y=H*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.beginPath();
  G.prices.forEach(function(pr,i){
    var x=G.prices.length===1?20:20+ i*(W-40)/Math.max(G.maxDays-1,1);
    var y=H-18-((pr-min)/(max-min))*(H-36);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  var up=G.price>=G.prices[0];
  ctx.strokeStyle=up?"#0090B3":"#E6392B"; ctx.lineWidth=3.5; ctx.lineJoin="round"; ctx.stroke();
  var lx=20+(G.prices.length-1)*(W-40)/Math.max(G.maxDays-1,1), ly=H-18-((G.price-min)/(max-min))*(H-36);
  ctx.fillStyle="#FFB800"; ctx.strokeStyle="#16130E"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(lx,ly,7,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=dark?"#FFF6E3":"#16130E"; ctx.font="bold 13px DM Sans";
  ctx.fillText("$"+max.toFixed(0),6,16); ctx.fillText("$"+min.toFixed(0),6,H-6);
}
$("qty-minus").addEventListener("click",function(){if(G){G.qty=Math.max(1,G.qty-5);updateTrade();}});
$("qty-plus").addEventListener("click",function(){if(G){G.qty=Math.min(100,G.qty+5);updateTrade();}});
$("btn-buy").addEventListener("click",function(){
  if(!G||G.over)return;
  var want=G.qty, afford=Math.floor(G.cash/G.price), buy=Math.min(want,afford);
  if(buy<1){logLine("💸 Not enough cash for even 1 share.");return;}
  G.cash-=buy*G.price; G.shares+=buy;
  logLine("🟢 Bought "+buy+" × "+G.comp[0]+" @ $"+G.price.toFixed(2)+".");
  updateTrade();
});
$("btn-sell").addEventListener("click",function(){
  if(!G||G.over)return;
  var sell=Math.min(G.qty,G.shares);
  if(sell<1)return;
  G.cash+=sell*G.price; G.shares-=sell;
  logLine("🔴 Sold "+sell+" × "+G.comp[0]+" @ $"+G.price.toFixed(2)+".");
  updateTrade();
});
$("btn-next").addEventListener("click",function(){
  if(!G||G.over)return;
  if(portfolio()>=G.target && G.day>2){endLevel(true);return;}
  if(G.day>=G.maxDays){endLevel(portfolio()>=G.target);return;}
  G.day++;
  var shock=(G.r()-0.5)*0.09*G.vol;
  var move=G.drift+shock;
  if(G.boss && G.day===Math.floor(G.maxDays/2)) { move-=0.06*G.vol; logLine("👑 BOSS MOVE: "+G.boss[1]+" shakes the market — sudden drop!"); }
  if(G.pattern.indexOf("Dip")===0 && G.day===Math.floor(G.maxDays/2)) move+=0.07;
  if(G.pattern.indexOf("Hype")===0 && G.day===G.maxDays-3) move-=0.08*G.vol;
  G.price=Math.max(1, Math.round(G.price*(1+move)*100)/100);
  G.prices.push(G.price);
  if(G.day===Math.floor(G.maxDays/2)+1) $("news-text").textContent= G.r()>0.5? pick(G.r,NEWS_UP): pick(G.r,NEWS_DOWN);
  logLine("📅 Day "+G.day+": "+G.comp[0]+" → $"+G.price.toFixed(2)+" ("+(move>=0?"+":"")+(move*100).toFixed(1)+"%)");
  updateTrade(); drawChart();
  if(G.day>=G.maxDays){ endLevel(portfolio()>=G.target); }
});
function endLevel(won){
  G.over=true; updateTrade();
  var val=portfolio();
  track(won?"level_clear":"level_fail","Level "+G.n+(G.L.isBoss?" · BOSS":"")+" — "+(state.current?state.current.name:"")+" · finished "+money(val)+" vs "+money(G.target)+" target");
  if(won){
    var ratio=val/G.target;
    var stars= ratio>=1.12?3 : ratio>=1.04?2 : 1;
    var prev=prog()[G.n];
    if(!prev||prev.stars<stars){ prog()[G.n]={stars:stars}; }
    var gained= stars*10 + G.n + (G.L.isBoss?40:0);
    if(!prev) state.xp+=gained;
    var gateMsg="";
    if(G.n===25) gateMsg=" 🔓 GATEWAY OPENED: 75 new levels (26–100) are now unlocked in Act II — The Empire Run!";
    if(G.n===100) gateMsg=" 🔓 LEGACY GATEWAY TRIGGERED: 100 final levels (101–200) are now unlocked in Act III — The Legacy Vault!";
    if(G.n===200) gateMsg=" 👑 You finished all 200 levels. Full cypher complete — from first share to legacy.";
    showModal("🏆","You leveled up for real — Level "+G.n+" cleared!","You finished at "+money(val)+" against a "+money(G.target)+" target — "+stars+" star"+(stars>1?"s":"")+". Sit with that: you read a real chart, made real calls, and beat a real target. That's not a game trick, that's a trader skill you now own. "+G.L.hist[0]+" — that's the standard you're trading in, and you just stood next to it."+gateMsg, G.n<200);
  } else {
    showModal("🎧","Setback — not a stop sign","You ended at "+money(val)+" — short of the "+money(G.target)+" target. Hear this plain: this is what real trading feels like some weeks, and every name in these history cards ate losses like this and kept going. You still leveled up — you learned how this "+G.pattern+" chart moves, and that read stays with you. Re-check the lesson, watch for the turn, and run it back like you mean it.", false);
    $("m-next").textContent="Run it back ↻";
  }
}
function showModal(emoji,title,body,hasNext){
  $("m-emoji").textContent=emoji; $("m-title").textContent=title; $("m-body").textContent=body;
  $("m-next").style.display=hasNext||!G||portfolio()<G.target?"inline-flex":"none";
  if(G&&portfolio()>=G.target) $("m-next").textContent="Next level →";
  $("modal").classList.add("show");
}
$("m-map").addEventListener("click",function(){$("modal").classList.remove("show");$("screen-level").style.display="none";$("screen-app").style.display="block";renderMap();window.scrollTo(0,0);});
$("m-next").addEventListener("click",function(){
  $("modal").classList.remove("show");
  if(G&&portfolio()>=G.target&&G.n<200){startLevel(G.n+1);}
  else if(G){startLevel(G.n);}
});
$("btn-back").addEventListener("click",function(){$("screen-level").style.display="none";$("screen-app").style.display="block";renderMap();window.scrollTo(0,0);});

/* ---------- Owners Portal: login, dashboard, analytics, traffic ---------- */
function showOwner(from){
  OWNER.returnTo=from||OWNER.returnTo||"door";
  $("screen-door").style.display="none"; $("screen-app").style.display="none"; $("screen-level").style.display="none";
  $("screen-owner").style.display="block";
  track("screen_view","owner — portal opened");
  if(OWNER.loggedIn){ $("owner-login-panel").style.display="none"; $("owner-dashboard").hidden=false; $("btn-owner-logout").hidden=false; renderOwnerDashboard(); startPulse(); }
  else{ $("owner-login-panel").style.display="block"; $("owner-dashboard").hidden=true; $("btn-owner-logout").hidden=true; syncOwnerForms(); }
  window.scrollTo(0,0);
}
function hideOwner(){
  stopPulse();
  $("screen-owner").style.display="none";
  if(OWNER.returnTo==="app"&&state.current){ $("screen-app").style.display="block"; }
  else if(OWNER.returnTo==="level"&&G){ $("screen-level").style.display="block"; }
  else{ $("screen-door").style.display="flex"; }
  window.scrollTo(0,0);
}
$("btn-owner-door").addEventListener("click",function(){showOwner("door");});
$("btn-owner-app").addEventListener("click",function(){showOwner("app");});
$("btn-owner-back").addEventListener("click",function(){hideOwner();});
function syncOwnerForms(){
  var hasPass=!!OWNER.passcode;
  $("form-owner-setup").hidden=hasPass; $("form-owner-login").hidden=!hasPass;
}
$("btn-owner-logout").addEventListener("click",function(){
  track("owner_logout",(OWNER.user?OWNER.user.name:"Owner"));
  OWNER.loggedIn=false; OWNER.user=null; stopPulse();
  $("owner-dashboard").hidden=true; $("owner-login-panel").style.display="block"; $("btn-owner-logout").hidden=true; syncOwnerForms();
});
$("form-owner-setup").addEventListener("submit",function(e){
  e.preventDefault();
  var name=$("setup-owner-name").value.trim(), id=$("setup-owner-id").value.trim().toLowerCase(), code=$("setup-owner-code").value, err=$("err-owner-setup");
  if(name.length<2){ err.style.display="block"; err.textContent="Enter the owner's name (at least 2 characters)."; return; }
  if(id.length<2){ err.style.display="block"; err.textContent="Pick an Owner ID (at least 2 characters)."; return; }
  if(!code||code.length<6){ err.style.display="block"; err.textContent="Create an access code of at least 6 characters."; return; }
  err.style.display="none";
  OWNER.ownerId=id; OWNER.passcode=code; OWNER.userName=name; OWNER.user={name:name,role:"Owner / Admin"}; OWNER.loggedIn=true;
  $("setup-owner-code").value="";
  track("owner_login",name+" · owner passcode set for this session");
  $("owner-login-panel").style.display="none"; $("owner-dashboard").hidden=false; $("btn-owner-logout").hidden=false;
  renderOwnerDashboard(); startPulse(); window.scrollTo(0,0);
});
$("form-owner-login").addEventListener("submit",function(e){
  e.preventDefault();
  var id=$("owner-id").value.trim().toLowerCase(), code=$("owner-code").value, err=$("err-owner");
  if(!OWNER.passcode||id!==OWNER.ownerId||code!==OWNER.passcode){ err.style.display="block"; err.textContent="That Owner ID / access code didn't match the passcode set this session. Try again."; track("blocked","Failed owner login attempt"); return; }
  err.style.display="none";
  OWNER.loggedIn=true; OWNER.user={name:OWNER.userName||"Owner",role:"Owner / Admin"};
  $("owner-code").value="";
  track("owner_login",OWNER.ownerId+" · owner signed back in");
  $("owner-login-panel").style.display="none"; $("owner-dashboard").hidden=false; $("btn-owner-logout").hidden=false;
  renderOwnerDashboard(); startPulse(); window.scrollTo(0,0);
});
function startPulse(){
  stopPulse();
  OWNER.pulseTimer=setInterval(function(){
    OWNER.pulse=Math.max(84,Math.min(240,OWNER.pulse+Math.round((Math.random()-0.46)*18)));
    var el=$("health-pulse"); if(el&&OWNER.loggedIn) el.textContent=OWNER.pulse+" online";
    var upd=$("owner-updated"); if(upd) upd.textContent="Updated "+new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"});
    var ses=$("owner-session"); if(ses){var s=Math.floor((Date.now()-ANALYTICS.startedAt)/1000); ses.textContent="Session: "+Math.floor(s/60)+"m "+String(s%60).padStart(2,"0")+"s · Started "+new Date(ANALYTICS.startedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});}
  },3000);
}
function stopPulse(){ if(OWNER.pulseTimer){clearInterval(OWNER.pulseTimer); OWNER.pulseTimer=null;} }
function fmtInt(n){return Number(n).toLocaleString("en-US");}
function renderOwnerDashboard(){
  if(!OWNER.user) return;
  $("owner-hello").textContent="Welcome back, "+OWNER.user.name+" 👑";
  var totalClearedAll=state.profiles.reduce(function(s,p){return s+Object.keys(state.progress[p.name]||{}).length;},0);
  $("owner-meta").textContent=OWNER.user.role+" · "+state.profiles.length+" player profile"+(state.profiles.length===1?"":"s")+" this session · "+totalClearedAll+" total levels cleared · "+fmtInt(state.xp)+" XP in play";
  $("kpi-profiles").textContent=fmtInt(ANALYTICS.profilesCreated);
  $("kpi-profiles-sub").textContent=ANALYTICS.logins+" return logins this session";
  $("kpi-cleared").textContent=fmtInt(ANALYTICS.levelClears);
  var rate=ANALYTICS.levelStarts?Math.round(ANALYTICS.levelClears/ANALYTICS.levelStarts*100):0;
  $("kpi-cleared-sub").textContent=fmtInt(ANALYTICS.levelStarts)+" started · "+rate+"% clear rate · "+fmtInt(ANALYTICS.levelFails)+" setbacks";
  $("kpi-events").textContent=fmtInt(ANALYTICS.events.length);
  $("kpi-events-sub").textContent=fmtInt(totalViews())+" screen views tracked";
  $("kpi-wallet").textContent=money2(ANALYTICS.depositVol+ANALYTICS.withdrawVol);
  $("kpi-wallet-sub").textContent=money2(ANALYTICS.depositVol)+" in ("+ANALYTICS.deposits+") · "+money2(ANALYTICS.withdrawVol)+" out ("+ANALYTICS.withdrawals+")";
  $("kpi-trades").textContent=fmtInt(ANALYTICS.liveBuys+ANALYTICS.liveSells);
  $("kpi-trades-sub").textContent=ANALYTICS.liveBuys+" buys · "+ANALYTICS.liveSells+" sells on the Live desk";
  $("kpi-xp").textContent=fmtInt(state.xp)+" XP";
  /* traffic */
  var mins=Math.max(1,(Date.now()-ANALYTICS.startedAt)/60000);
  $("traffic-rate").textContent=(ANALYTICS.events.length/mins).toFixed(1)+" events / min";
  $("health-views").textContent=fmtInt(totalViews());
  $("health-pulse").textContent=OWNER.pulse+" online";
  $("health-errors").textContent=fmtInt(ANALYTICS.errors);
  var labels={door:"🚪 Front Door",map:"🗺️ Level Map",live:"📈 Live Trading",wallet:"👛 Wallet",level:"🎮 In a Level",owner:"🔐 Owners"};
  var maxV=Math.max(1,Math.max.apply(null,Object.keys(ANALYTICS.views).map(function(k){return ANALYTICS.views[k];})));
  var barCls={door:"gold",map:"",live:"pink",wallet:"gold",level:"",owner:"purple"};
  $("traffic-bars").innerHTML=Object.keys(labels).map(function(k){
    return '<div class="bar-row"><span>'+labels[k]+'</span><div class="bar-track"><i class="'+(barCls[k]||"")+'" style="width:'+Math.round(ANALYTICS.views[k]/maxV*100)+'%"></i></div><b>'+ANALYTICS.views[k]+'</b></div>';
  }).join("");
  $("owner-feed").innerHTML= ANALYTICS.events.length ? ANALYTICS.events.slice(0,14).map(function(ev){
    return '<div class="feed-item"><span><b>'+esc(ev.type.replace(/_/g," "))+'</b><br/><span style="color:var(--muted)">'+esc(ev.detail||"—")+'</span></span><time>'+esc(ev.time)+'</time></div>';
  }).join("") : '<div class="feed-item"><span>No activity yet — create a profile or play a level and it lands here instantly.</span></div>';
  drawTrafficChart();
  /* game analytics */
  var actCounts=ACTS.map(function(act){
    var c=0; state.profiles.forEach(function(p){Object.keys(state.progress[p.name]||{}).forEach(function(n){n=Number(n); if(n>=act.from&&n<=act.to) c++;});});
    return {act:act,c:c,total:act.to-act.from+1};
  });
  var maxAct=Math.max(1,Math.max.apply(null,actCounts.map(function(a){return a.c;})));
  $("analytics-acts").innerHTML='<div style="font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Levels cleared by act (all profiles)</div>'+actCounts.map(function(a){
    return '<div class="bar-row"><span>'+a.act.name.split(" — ")[0]+'</span><div class="bar-track"><i style="width:'+Math.round(a.c/maxAct*100)+'%"></i></div><b>'+a.c+'/'+a.total+'</b></div>';
  }).join("");
  var diffCount={}; state.profiles.forEach(function(p){var l=difficulty(p).label; diffCount[l]=(diffCount[l]||0)+1;});
  $("analytics-diff").innerHTML= Object.keys(diffCount).length ? Object.keys(diffCount).map(function(k){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line)"><span>'+esc(k)+'</span><b>'+diffCount[k]+' profile'+(diffCount[k]===1?"":"s")+'</b></div>';}).join("") : '<p style="color:var(--muted);margin:4px 0 0">No profiles yet.</p>';
  $("analytics-boss").textContent= ANALYTICS.bossStarts ? ANALYTICS.bossStarts+" boss level"+(ANALYTICS.bossStarts===1?"":"s")+" started · "+ANALYTICS.bossClears+" cleared · "+ANALYTICS.bossFails+" failed — "+(ANALYTICS.bossStarts?Math.round(ANALYTICS.bossClears/Math.max(1,ANALYTICS.bossStarts)*100):0)+"% boss clear rate." : "No boss attempts yet this session. Bosses land every 5th level.";
  var totalBal=state.profiles.reduce(function(s,p){var w=state.wallets[p.name]; return s+(w?w.balance:0);},0);
  $("analytics-wallet").innerHTML=
    '<div><span>Total wallet cash held (all profiles)</span><span><b>'+money2(totalBal)+'</b></span></div>'+
    '<div><span>Deposits</span><span>'+ANALYTICS.deposits+' · '+money2(ANALYTICS.depositVol)+'</span></div>'+
    '<div><span>Withdrawals</span><span>'+ANALYTICS.withdrawals+' · '+money2(ANALYTICS.withdrawVol)+'</span></div>'+
    '<div><span>Live desk</span><span>'+(allLevelsDone()?"🔓 Open for a 200/200 profile":"🔒 Locked — needs 200/200")+'</span></div>';
  /* roster */
  $("owner-roster").innerHTML= state.profiles.length ? '<div style="overflow-x:auto"><table class="owner-table"><thead><tr><th>Player</th><th>Difficulty</th><th>Levels</th><th>Wallet</th></tr></thead><tbody>'+state.profiles.map(function(p){
    var cnt=Object.keys(state.progress[p.name]||{}).length; var w=state.wallets[p.name];
    return '<tr><td><b>'+esc(p.face)+' '+esc(p.name)+'</b></td><td>'+esc(difficulty(p).label)+'</td><td>'+cnt+' / 200</td><td>'+(w?money2(w.balance):"$0.00")+'</td></tr>';
  }).join("")+'</tbody></table></div>' : '<p style="color:var(--muted)">No player profiles yet. Profiles created at the front door appear here with level progress and wallet balance.</p>';
  /* full log */
  $("log-count").textContent=ANALYTICS.events.length+" events";
  $("owner-log-body").innerHTML= ANALYTICS.events.length ? ANALYTICS.events.slice(0,60).map(function(ev){return '<tr><td style="white-space:nowrap">'+esc(ev.time)+'</td><td><b>'+esc(ev.type.replace(/_/g," "))+'</b></td><td>'+esc(ev.detail||"—")+'</td></tr>';}).join("") : '<tr><td colspan="3" style="color:var(--muted)">No events logged yet.</td></tr>';
  var upd=$("owner-updated"); if(upd) upd.textContent="Updated "+new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit"});
}
function drawTrafficChart(){
  var c=$("traffic-chart"); if(!c) return;
  var ctx=c.getContext("2d"), W=c.width, H=c.height;
  var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  ctx.clearRect(0,0,W,H);
  var buckets=new Array(12).fill(0), now=Date.now(), span=12*30000;
  ANALYTICS.events.forEach(function(ev){var age=now-ev.t; if(age<span){var idx=11-Math.floor(age/30000); if(idx>=0&&idx<12) buckets[idx]++;}});
  if(ANALYTICS.events.length&&buckets.every(function(b){return b===0;})) buckets[11]=ANALYTICS.events.length;
  var max=Math.max(2,Math.max.apply(null,buckets));
  ctx.strokeStyle=dark?"#372E55":"#E3DCCB"; ctx.lineWidth=1;
  for(var i=1;i<4;i++){var y=H*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  var bw=(W-40)/12;
  buckets.forEach(function(b,i){
    var h=Math.max(b?8:2,(b/max)*(H-44)); var x=20+i*bw+3, y=H-20-h;
    ctx.fillStyle= i===11 ? "#F72585" : "#0090B3";
    ctx.fillRect(x,y,bw-6,h);
    ctx.fillStyle=dark?"#FFF6E3":"#16130E"; ctx.font="bold 12px DM Sans"; ctx.textAlign="center";
    if(b>0) ctx.fillText(String(b),x+(bw-6)/2,y-5);
  });
  ctx.textAlign="left"; ctx.fillStyle=dark?"#CFC4E8":"#5D5546"; ctx.font="bold 11px DM Sans";
  ctx.fillText("LAST 6 MINUTES → NOW · ONE BAR = 30 SECONDS OF REAL SESSION EVENTS",20,14);
}
$("btn-owner-refresh").addEventListener("click",function(){renderOwnerDashboard();});
$("btn-owner-reset").addEventListener("click",function(){
  var keepUser=OWNER.user; ANALYTICS=freshAnalytics(); track("owner_login",(keepUser?keepUser.name:"Owner")+" · analytics reset"); renderOwnerDashboard();
});
$("btn-owner-export").addEventListener("click",function(){
  var rows=[["time","event","detail"]].concat(ANALYTICS.events.slice().reverse().map(function(ev){return [ev.time,ev.type,(ev.detail||"").replace(/"/g,'""')];}));
  var csv=rows.map(function(r){return r.map(function(v){return '"'+v+'"';}).join(",");}).join("\n");
  var a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="wall-st-cypher-activity.csv"; document.body.appendChild(a); a.click(); a.remove();
  track("screen_view","owner — exported activity CSV");
});
track("screen_view","door — front door loaded");
ANALYTICS.views.door=1;
refreshLoginList();
