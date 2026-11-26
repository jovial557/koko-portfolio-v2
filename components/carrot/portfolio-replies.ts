export type CarrotMessage = { role: "user" | "assistant"; content: string };

export function getPortfolioAnswer(
    question: string,
    history: CarrotMessage[] = []
) {
    const q = question.toLowerCase().trim()

    // Social greetings are welcome, without requiring a portfolio keyword.
    const greeting = q
        .replace(/[.,!?~🥕🐰👋😊☺️]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    const isGreeting =
        /^(?:(?:oh|well|umm|uh|yo)\s+)?(?:hi+|hii+|hiii+|hey+|heyy+|hello+|helloo+|hiya|heya|howdy|howdy doo|howdy doody|yo+|yooo+|sup|wassup|what s up|whats up|what up|good morning|good afternoon|good evening|greetings|bonjour|hola|konnichiwa|こんにちは|やっほー|やほ)(?:\s+(?:there|carrot|bunny|friend|everyone|you|how are you|how s it going|how is it going))?$/.test(
            greeting
        )
    const isCheckIn =
        /^(?:how are you|how re you|how are ya|how s it going|how is it going|how you doing|howdy doo|howdy doody|how are things)(?:\s+carrot)?$/.test(
            greeting
        )
    if (isGreeting || isCheckIn) {
        const greetedBefore = history.some(
            (m) =>
                m.role === "assistant" &&
                /I'm Carrot|I’m Carrot/.test(m.content)
        )
        if (isCheckIn)
            return "Hey you!! 🐰🥕 I'm doing wonderfully—just hopping around Koko's little corner of the internet! How lovely of you to ask. I’m Carrot, her portfolio guide. Want to hear about Redline, her other projects, or a little about Kokona?"
        if (greetedBefore)
            return "Hii again!! 🥕🐰 So happy you're here! Want to explore one of Koko’s projects or learn more about her? I'm all ears!"
        return "Hey you!! 🐰🥕 I'm Carrot, Koko's little portfolio guide! It's so nice to meet you. Welcome to her corner of the internet! I can tell you about Kokona, show you her creative projects, or share how she brings her ideas to life. Try asking me about Redline, her favorite project, or anything about her work! 💛"
    }

    // Small-talk responses should take priority over generic portfolio summaries.
    const recentAssistant =
        history
            .slice()
            .reverse()
            .find((m) => m.role === "assistant")
            ?.content.toLowerCase() || ""
    const chat = q
        .replace(/[.!?,~🥕🐰💛🥹❤️😍]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    if (
        /\b(?:calculate|solve|equation|algebra|calculus|derivative|integral|factor|multiply|divide|square root|homework|write my essay|write my assignment)\b|\d+\s*[+*÷×=]\s*\d+/i.test(
            q
        )
    )
        return "Hehe, math and homework are outside my little bunny job description! 🥕 I'm here for friendly chats and stories about Koko's creative work."
    if (
        /(?:she|koko)\s+(?:sounds|seems|must be)\s+(?:so\s+|really\s+|very\s+)?(?:nice|sweet|kind|lovely|cool|interesting|fun|thoughtful|creative|talented|amazing)\b|^(?:i can tell|i can see that|i bet|i figured)(?:\s+.*)?$/.test(
            chat
        )
    )
        return "Awww, I think you'd get along with her! 🐰 She's curious about so many things and loves making playful ideas real. Are you into creative things too?"
    if (
        /^(?:thank you|thanks|thank u|tysm|ty|thx|appreciate it|that helps|youre welcome)(?:\s+.*)?$/.test(
            chat
        )
    )
        return "Of course!! 🥕 It's lovely talking with you. Anything else you're curious about?"
    if (
        /^(?:haha+|hehe+|lol+|lmao|aww+|awww+|omg+|oh wow|no way|that's funny|thats funny)(?:\s+.*)?$/.test(
            chat
        )
    )
        return "Hehehe!! 🐰 You're making this little bunny's day. What caught your eye while exploring?"
    if (
        /^(?:yes|yeah|yep|yup|sure|absolutely|definitely|of course|sounds good|okay|ok|no|nope|not really|maybe|not sure|same|me too|i agree|exactly|true|fair enough)(?:\s+.*)?$/.test(
            chat
        )
    ) {
        if (
            /creative things|are you into|what kind of projects/.test(
                recentAssistant
            )
        )
            return "Ooh, I'd love to hear more! 🐰 What kinds of things do you like making?"
        return "Hehe, I'm with you! 🥕 Want to tell me more?"
    }
    if (
        /\b(?:what about you|tell me about yourself|who are you|are you real|are you ai|what do you do|why a bunny|why are you a bunny|do you like koko|do you like her)\b/.test(
            q
        )
    ) {
        if (/why.*bunny/.test(q))
            return "Koko likes giving her ideas personality! 🐰 I'm a tiny digital companion, here to guide visitors and make the portfolio a little more playful."
        return "I'm Carrot! 🐰 A digital bunny who chats with visitors and shares Koko's work. I'm software, not a real rabbit, but I take my carrot duties seriously! 🥕"
    }
    if (/nice to meet you|glad to meet you|pleasure to meet you/.test(q))
        return "The pleasure's all mine! 🐰 Are you here for the design work, the experiments, or just to say hello?"
    if (
        /\b(?:i am|i'm|im)\s+(?:a |an )?(?:designer|artist|developer|student|creative|engineer|writer|photographer|animator)\b/.test(
            q
        )
    )
        return "Ooh, a fellow creative!! 🥹 What kind of projects do you enjoy making?"
    if (
        /\b(?:i like|i love|i enjoy|i'm into|im into|my favorite is|i make|i create)\b/.test(
            q
        ) &&
        !/\b(?:solve|homework|essay|math)\b/.test(q)
    )
        return "Ooh, tell me more! 🐰 Koko loves when different interests collide. That's often where interesting ideas begin."
    if (
        /how's your day|hows your day|how was your day|what are you up to|are you happy|are you tired/.test(
            q
        )
    )
        return "Pretty lovely now that I have company! 🐰🥕 How's your day going?"
    if (
        /\b(?:i'm|im|i am|feeling)\s+(?:good|great|okay|ok|happy|excited|tired|stressed|sad|nervous|bored)\b/.test(
            q
        )
    )
        return "Thanks for telling me! 💛 I'm here for a little company if you want it. Want to tell me more?"

    // Catch compliments, including brief reactions and informal internet slang.
    const cleaned = q
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    const compliment =
        /\b(nice|ncie|epic|cool|amazing|awesome|incredible|impressive|beautiful|gorgeous|stunning|brilliant|fantastic|excellent|wonderful|cute|adorable|talented|genius|inspiring|great|love|loved|lovely|obsessed|sick|fire|dope|rad|insane|slay|clean|wow|woah|omg|sweet|perfect|neat|lit|superb|fabulous|loving)\b|well done|good job|you nailed|so proud|looks great|looks good|🔥|❤️|💖|🥹|😍/i.test(
            q
        )
    const questionIntent =
        /\b(what|why|how|when|where|who|which|can|could|tell me|explain|show me|describe|do you|does she)\b|\?/i.test(
            q
        )
    if (compliment && !questionIntent && cleaned.split(" ").length <= 24) {
        const last =
            history
                .slice()
                .reverse()
                .find((m) => m.role === "assistant")
                ?.content.toLowerCase() || ""
        const referent = /\b(redline|ferrari|formula.?1|hackathon)\b/.test(
            q
        )
            ? "redline"
            : /\bmuji\b/.test(q)
              ? "muji"
              : /\b(nypl|library)\b/.test(q)
                ? "nypl"
                : /\b(bunny|carrot)\b/.test(q)
                  ? "bunny"
                  : /\b(redline|ferrari|formula.?1|hackathon)\b/.test(last)
                    ? "redline"
                    : /\bmuji\b/.test(last)
                      ? "muji"
                      : /\b(nypl|library)\b/.test(last)
                        ? "nypl"
                        : "general"
        if (referent === "redline")
            return "Ahhh, that's so lovely to hear!! 🥹❤️ Koko put so much thought into Redline. I'm sure your kind words would make her day!"
        if (referent === "muji")
            return "Aww, thank you!! 🥕💛 Koko really cares about thoughtful details, so I'm so happy the MUJI project caught your eye!"
        if (referent === "nypl")
            return "Eee, thank you!! 🐰💛 Koko put a lot of heart into the NYPL concept. That means so much!"
        if (referent === "bunny")
            return "You're making this little bunny blush!! 🐰🥕 Thank you for being so sweet!"
        return "Awww, thank you so much!! 🥹🥕 Koko puts so much love and curiosity into her work. That's such a lovely thing to say!"
    }
    const brief = q
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    const briefPraise =
        /^(?:(?:so|really|super|very|absolutely|totally|that is|this is|its|thats)\s+)*(?:nice|ncie|epic|cool|awesome|amazing|sick|fire|dope|rad|insane|great|beautiful|gorgeous|incredible|impressive|brilliant|fantastic|cute|adorable|sweet|clean|neat|wow|omg|woah|yooo|love it|well done|good job)(?:\s+(?:work|job|project|design|film|site|website|portfolio|stuff|one))?$/.test(
            brief
        )
    if (briefPraise) {
        const last =
            history
                .slice()
                .reverse()
                .find((m) => m.role === "assistant")
                ?.content.toLowerCase() || ""
        if (/redline|ferrari|formula.?1|hackathon/.test(last))
            return "Ahhh, thank you!! 🥹❤️ Koko put so much care into Redline, so that would absolutely make her day. I’m so happy you enjoyed it!"
        if (/muji/.test(last))
            return "Awww, thank you!! 🥕💛 Koko cares so much about the little details in her MUJI project. I’m so glad you noticed! /muji"
        if (/nypl|library/.test(last))
            return "Eee, thank you!! 🐰💛 Koko put a lot of love into her NYPL redesign. That’s such a lovely thing to hear! /nypl"
        if (/bunny|carrot|bunny quest/.test(last))
            return "Awww!! You’re making this little bunny blush! 🐰🥕 Thank you for being so sweet."
        return "Awww, thank you so much!! 🥹🥕 Koko puts a lot of care and curiosity into her work. That’s so lovely to hear!"
    }

    const praise =
        /\b(love|loved|lovely|amazing|awesome|incredible|impressive|beautiful|gorgeous|stunning|brilliant|fantastic|excellent|wonderful|cool|cute|adorable|talented|genius|inspiring|inspirational|great|favorite|favourite|obsessed|well done|good job|nice work|so good|so pretty|so creative|proud of|you nailed|you ate|slay)\b|🔥|❤️|💖|🥹|😍/i.test(
            q
        )
    const portfolioMention =
        /\b(redline|ferrari|formula.?1|hackathon|muji|nypl|library|bunny|carrot|bunny quest|portfolio|website|site|design|work|project|film|animation|interaction|creative|koko|kokona|your|you|her|she)\b/i.test(
            q
        )
    const complimentOnly =
        /^(?:wow+|omg+|aww+|ahh+|so cool|love it|i love this|this is amazing|this is beautiful|that's incredible|thats incredible|great job|well done|so good|it's beautiful|its beautiful)[! .🥹❤️😍💖🔥]*$/i.test(
            q
        )
    const looksLikeQuestion =
        /\b(why|how|what|when|where|who|which|tell me|explain|show me|can you|could you)\b|\?/i.test(
            q
        )
    if (
        praise &&
        (portfolioMention || complimentOnly) &&
        !looksLikeQuestion
    ) {
        if (/redline|ferrari|formula.?1|hackathon/.test(q))
            return "Ahhh, that's so sweet of you to say!! 🥹❤️ Koko put so much thought into bringing Redline's world to life. I'm sure she'd be thrilled that it connected with you!"
        if (/muji/.test(q))
            return "Awww, thank you!! 🥕💛 Koko cares a lot about the little details that make an experience feel thoughtful. I'm so glad the MUJI project caught your eye! There's more at /muji."
        if (/nypl|library/.test(q))
            return "That makes my little bunny heart happy! 🐰💛 Koko put a lot of care into making the NYPL identity feel alive. Thank you for noticing! You can see more at /nypl."
        if (/bunny|carrot|bunny quest/.test(q))
            return "Eee, thank you!! 🐰🥕 You're making a little bunny blush. Koko loves giving her experiments personality, so I'm really happy you noticed!"
        return "Awww, that is incredibly kind of you!! 🥹🥕 Koko puts so much curiosity and care into her projects, and I'm sure she'd be so happy to hear that. Thank you for taking the time to explore her little corner of the internet! 💛"
    }

    // Curated interview-style prompts, grounded in Koko's own work.
    if (
        /(?:what.{0,35}(?:working on|been making|latest work|recent projects)|what.s new with (?:koko|kokona)|working on lately)/i.test(
            q
        )
    )
        return "Ooh, Redline!! 🏎️✨ Koko imagined a future where Formula 1 cars could fly, then brought that world to life in just three days using AI. It won first place at her hackathon! I'm one proud little bunny. 🐰🥕"
    if (
        /(?:how.{0,35}(?:approach|tackle|handle).{0,35}(?:challenge|problem|new)|(?:creative|design|working) process|learn.{0,30}(?:tool|technology)|adapt.{0,30}(?:technology|change)|balance.{0,25}(?:speed|quality|deadline))/i.test(
            q
        )
    )
        return "Ooh, Koko gets really curious when something seems difficult! 🐰 She likes to explore unfamiliar tools, experiment, and figure out what actually helps an idea come to life. She's ambitious about what she wants to make, but she's disciplined about deadlines, too. Redline is a good example: she built it in three days without treating the first generated result as the final answer. For Koko, moving fast doesn't mean letting go of creative judgment or the details that make something feel intentional. 🥕"
    if (
        /(?:what.s it like|what is it like|how is it|how would it be).{0,25}work(?:ing)? with (?:koko|kokona|her)|(?:koko|kokona).{0,35}(?:teammate|collaborat|work ethic)|(?:working|work) with (?:koko|kokona)/i.test(
            q
        )
    )
        return "Ooh, great question!! 🐰 From the way Koko approaches her projects, she seems like someone who brings curiosity, initiative, and a lot of care to the work. She's resourceful when technology is unfamiliar, disciplined about getting things finished, and willing to refine the details instead of settling for something that merely looks done. I can't speak for every teammate she's worked with, but her projects show how seriously she takes both imagination and execution. Hehe, can you tell I'm a proud little bunny? 🥕"
    if (
        /(?:what|which|tell me).{0,85}(?:project|work|piece).{0,55}(?:proud|pride)|(?:project|work).{0,50}(?:most proud|proudest)|(?:most proud of)/i.test(
            q
        )
    )
        return "Ohhh, definitely Redline! 🥹🏎️ Koko dreamed up the concept and planned the film on day one, built the visual assets and its world on day two, and turned everything into moving scenes on day three. In just three days, an idea became a finished film! It was even featured at FLORA's Brooklyn office, which was such a special moment for her. Redline went on to win first place at the 2026 AI Hackathon—and that opportunity helped her land her first internship. I'm a very proud little bunny. 🐰🥕"
    if (
        !/\b(?:what|why|how|who|where|when|can you|could you|tell me|explain|define|list|give me|help me|teach me)\b/.test(
            q
        ) &&
        q.length < 160 &&
        !/\b(?:koko|kokona|portfolio|redline|muji|nypl)\b/.test(q)
    )
        return "Ooh, I'm listening! 🐰🥕 Tell me a little more. I love a friendly chat!"
    if (
        !/\b(koko|kokona|akatsu|her|she|you|your|portfolio|work|project|design|redline|muji|nypl|library|bunny|quest|hackathon|fit|about|experience|creative|contact|hire|email|study|studies|japan)\b/.test(
            q
        )
    )
        return "I'm Carrot, Koko's portfolio guide! 🥕 I only answer questions about her, her work, and her creative process. Try asking me about Redline or Bunny Quest."
    if (/redline|formula.?1|ferrari|hackathon/.test(q))
        return "Redline is Koko's AI-directed futuristic Formula 1 short film. She imagined flying Ferraris, built a cinematic world, and won first place at a 2026 AI hackathon."
    if (/bunny.?quest|mascot|bunny/.test(q))
        return "Bunny Quest explores animated 3D bunny advisors and playful visual experiences made with node-based AI tools. Koko also built the animated bunny you just clicked to meet me!"
    if (/muji/.test(q))
        return "Koko redesigned MUJI's online shopping experience for holiday gifting, exploring a custom gift builder and interactive elements. You can view the case study at /muji."
    if (/nypl|library/.test(q))
        return "Koko's New York Public Library branding exploration imagines the library as a living exchange of knowledge—more than a building full of books. See /nypl."
    if (/contact|email|hire|reach/.test(q))
        return "I'd love to help you connect with Koko. Please use the contact links on her portfolio; I don't share private contact details."
    if (
        /^(?:she|her|koko|kokona)\b/.test(q) &&
        !/\b(?:what|why|how|who|where|when|tell|explain)\b/.test(q)
    )
        return "Hehe, I love hearing what people think of Koko! 🐰🥕 What made you say that?"
    if (
        /japan|background|about|designer|design|creative|work|experience|fit|who|study|studies|portfolio|you|koko|kokona|akatsu|her|she/.test(
            q
        )
    )
        return "Koko is a design student at FIT exploring storytelling, digital experiences, and emerging technology. Her projects include Redline, MUJI, NYPL, and Bunny Quest. Which one would you like to know more about?"
    return "I don't have a verified answer for that yet. I only share information from Koko's approved portfolio—try asking about her projects, creative direction, or background."
}
