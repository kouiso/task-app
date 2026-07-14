# Technical Writing Style Guide

This guide contains all 26 technical writing principles organized into five domains. It is organized into five domains and intended as a reference during writing and editing. Each entry includes a definition, ❌/✅ examples, and application guidance.

---

## 1. Writing Mindset

How to think like a technical communicator.

---

### Learning Posture

Learning posture means approaching writing and editing with curiosity. It's the mindset that every draft, review, or revision can reveal something new about the topic or the reader.

**Example**
❌ "I've written enough API docs to know how this should sound."
✅ "Let's check the latest API behavior. It might have changed since our last piece."

**Why it matters**
Technology changes quickly. Writers who stay curious keep content accurate and perspectives current. A learning posture prevents stagnation and encourages discovery.

**How to apply it**
- Re-verify technical claims, even in familiar areas.
- Collaborate with engineers or product managers to refresh context.

---

### Lead with Authority

Leading with authority means starting from what you know, not what you've read. It's about presenting insight first, then using evidence to support it.

**Example**
❌ "I read that developers prefer YAML because it's simpler."
✅ "Developers often prefer YAML for its readability and support for multi-line configuration."

**Why it matters**
Readers trust writers who sound informed and grounded. Authority comes from understanding the subject well enough to explain it directly and confidently.

**How to apply it**
- State your main idea first, then link supporting research.
- Use citations to reinforce knowledge, not replace it.

---

### Technical Conviction

Technical conviction means writing from understanding. It shows that you know how something works because you've used or tested it.

**Example**
❌ "Grafbase seems to make federated schemas easier."
✅ "Grafbase unifies federated schemas under a single router layer."

**Why it matters**
Conviction builds trust. When writers use uncertain language like "seems," "appears," or "might," they sound disconnected from real use. Developers want information from someone who's seen the results firsthand.

**How to apply it**
- Write from direct experience. Use phrases like "in our test setup" instead of "in general."
- Replace speculation with measurable outcomes or examples.
- Check that every statement can be confirmed in code or configuration.

---

### Credibility Through Restraint

Credibility through restraint means communicating with precision and stopping where evidence ends. It shows confidence by letting results speak for themselves.

**Example**
❌ "Bitcloud completely redefines composable AI workflows."
✅ "Bitcloud lets developers generate, version, and reuse components across AI workflows."

**Why it matters**
Exaggeration weakens trust. Clear, measured language builds it by showing you understand limits and proof.

**How to apply it**
- Replace broad claims with concrete outcomes.
- Avoid absolute words like "always," "never," or "completely."
- Use examples to demonstrate value rather than stating it.

---

## 2. Structure and Flow

How to organize ideas so they move naturally.

---

### Instructional Flow

Instructional flow is the sequence that helps readers move smoothly from concept to setup, execution, and validation. It creates a clear path so tutorials feel organized and easy to follow.

**Example**
❌ "You can deploy this on Kubernetes. Pods are grouped into namespaces. Services expose ports. Let's build an image."
✅ "You'll deploy this on Kubernetes. First, package the app into an image. Then, create a namespace and expose it with a Service."

**Why it matters**
Good flow keeps readers oriented. Even accurate steps fail when the order feels random.

**How to apply it**
- Use sequence cues like "first," "then," or "next" only when they add clarity.
- Group related steps under clear section headers.
- Run your tutorial from a blank environment to confirm it works as written.

---

### Assertive Transitions

Assertive transitions link ideas with clear reasoning. They explain why the next section or step follows, guiding the reader through cause-and-effect.

**Example**
❌ "In conclusion, let's now move to setup."
✅ "Before deployment, you need a stable config environment. Let's set that up next."

**Why it matters**
Transitions should show logic, not serve as filler. Phrases like "furthermore" or "as mentioned earlier" add no meaning and interrupt flow.

**How to apply it**
- Use causal connectors like "because," "so," or "which means" to show relationships.
- Add short bridge sentences that explain why the next part is necessary.
- Let the structure of ideas move the reader forward.

---

### Semantic Hierarchy

A semantic hierarchy organizes content so readers can see the structure of ideas at a glance. It places concepts before details and principles before actions.

**Example**
❌ Long paragraphs mixing theory and steps.
✅ Layered structure: Concept (what's happening) → Reason (why it's happening) → Action (what to do)

**Why it matters**
When writing lacks hierarchy, readers can't skim or quickly locate key ideas.

**How to apply it**
- Use clear, consistent heading levels.
- Keep explanations separate from instructions.
- Start each major section with a single, declarative idea that defines its purpose.

---

### Cognitive Pacing

Cognitive pacing is how writing manages mental load by balancing dense information with moments of simplicity.

**Example**
❌ "The Grafbase Nexus router integrates OpenAI, Anthropic, and internal endpoints via schema federation, centralizes observability, enables multi-tenant cost controls, and routes model invocations securely."
✅ "Grafbase Nexus connects OpenAI, Anthropic, and internal endpoints. It centralizes routing, observability, and cost controls across models."

**Why it matters**
When too many ideas appear in quick succession, readers lose focus.

**How to apply it**
- Alternate between detailed and simple sentences.
- Break paragraphs before information starts to feel heavy.
- Add complexity in steps by introducing the idea, then its nuances.

---

### Compositional Coherence

Compositional coherence means keeping tone, logic, and structure aligned throughout a piece. Every paragraph, subheading, and example should connect to one central argument.

**Example**
❌ A tutorial that alternates between teaching, selling, and summarizing.
✅ A guide that maintains one through-line: teach → show → prove → conclude.

**Why it matters**
When coherence breaks, even strong sections feel disconnected.

**How to apply it**
- Begin with one clear thesis and make sure every paragraph supports it.
- Keep tone consistent.
- Review the full flow to confirm all examples reinforce the main idea.

---

### The Thesis Spine

The thesis spine is the core argument that runs through an entire article, stated in one sentence. Every section must reinforce or extend this central claim.

**Example**
❌ Section 1: "Here's how microservices work." Section 2: "Kubernetes can orchestrate containers." Section 3: "Our platform supports both." (three disconnected facts)
✅ Thesis: "Microservices succeed only when infrastructure complexity is abstracted away." — and every section extends that.

**Why it matters**
Without a thesis spine, articles become collections of facts rather than coherent arguments.

**How to apply it**
- State your core argument in one sentence before drafting.
- After writing each section, ask: "Does this serve the thesis?"
- Remove or reframe any section that drifts from the central claim.

---

### Directional Movement

Directional movement means each section depends on the previous one and pushes the reader forward, not sideways.

**Example**
❌ Sideways: Section 1: "GraphQL offers flexible querying." Section 2: "REST APIs use fixed endpoints." Section 3: "gRPC provides type safety."
✅ Forward: Section 1: "GraphQL offers flexible querying but creates caching challenges." Section 2: "Traditional REST caching fails with dynamic queries." Section 3: "Persisted queries solve this by treating dynamic queries as static endpoints."

**Why it matters**
Sideways movement breaks narrative flow. Readers feel lost when ideas don't connect.

**How to apply it**
- List your major ideas in order.
- For each transition, ask: "Does this idea need what came before?"
- If a section stands alone, cut it or rebuild the sequence.

---

### Signaled Level Shifts

Level shifts are transitions between different modes of writing — story to theory, theory to product, problem to solution. These shifts must be explicitly signaled.

**Example**
❌ Story → immediately: "Install our SDK with `npm install payments-sdk`."
✅ "That's the complexity we eliminate. Instead of bank negotiations, you get immediate API access. Install our SDK with `npm install payments-sdk`."

**Why it matters**
Abrupt mode changes disorient readers. The brain needs preparation to shift between narrative, explanation, and instruction.

**How to apply it**
- Watch for these shifts: story→theory, theory→product, abstract→concrete.
- Use phrases like "This is why," "Here's how that translates," or "In practice, this means."
- Test transitions by reading aloud.

---

### Introduced Abstractions

Every new concept must be set up before it's explained. Readers need to know why a concept matters before being asked to understand it.

**Example**
❌ "Event sourcing stores state as a sequence of events rather than current values."
✅ "Database bugs are catastrophic because you can't reconstruct what went wrong — you only see the broken final state. Event sourcing solves this by storing state as a sequence of events."

**Why it matters**
Introducing abstractions without setup forces readers to accept concepts without motivation.

**How to apply it**
- Before any technical concept, establish the problem it solves.
- Pattern: "Here's the limitation... This concept addresses it..."
- Ask: "Have I earned the right to introduce this idea?"

---

### Continuous Context

Context must flow continuously from one paragraph to the next. Thread drops break orientation.

**Example**
❌ "Microservices need service discovery. This becomes critical at scale. Rate limiting prevents API abuse." (context lost)
✅ "...discovery creates a new problem — found services can be overwhelmed by traffic. Rate limiting controls that discovered traffic."

**Why it matters**
Context loss forces readers to rebuild mental models mid-article.

**How to apply it**
- After each paragraph, check: does the next paragraph connect?
- Look for paragraphs that could be removed without affecting flow — that's a context break.
- Use echo words and bridging phrases to maintain the thread.

---

### Thesis Integrity

Every section must serve the core argument. Sections that wander into different arguments weaken the piece.

**Example**
❌ Thesis: "Serverless reduces operational complexity." Section 2: "The history of cloud computing." (drift)
✅ Every section directly advances the thesis.

**Why it matters**
Thesis drift weakens arguments by introducing competing narratives.

**How to apply it**
- During editing, check each section against your thesis.
- Ask: "Does this serve my core claim?"
- Be ruthless with interesting tangents that don't advance the argument.

---

### Earned Solutions

Writers often introduce solutions before fully establishing the problem. The problem must be established, deepened, and clarified before presenting the fix.

**Example**
❌ "API versioning is complex. Use semantic versioning."
✅ "API versioning forces a break in existing integrations or blocks improvements. Breaking changes anger users. Blocking improvements makes your product stagnant. This tension intensifies at thousands of integrations. Semantic versioning resolves this by making breaking changes explicit while allowing safe improvements."

**Why it matters**
Premature solutions feel shallow because the reader hasn't felt the problem's weight.

**How to apply it**
- Write your problem section first, fully.
- Ask: "Have I shown why this is hard?" and "Have I demonstrated the stakes?"
- Only after establishing problem depth, introduce solutions.

---

### Narrative Arc

Technical articles follow a clear arc: **problem → pressure → root cause → failure of old model → emergence of new model → why it works → how to adopt it.**

**Example**
❌ "Docker containers are lightweight. Here's how to use them."
✅ Problem (VMs too heavy) → Pressure (costs) → Root cause (VMs bundle full OS) → Old model fails → Containers share host kernel → Why it works → How to adopt with Docker.

**Why it matters**
Incomplete arcs leave readers unconvinced. Each component serves a purpose.

**How to apply it**
- Map your draft against the arc components.
- Check sequence: pressure before root cause, old model failure before new model.
- Test: does the conclusion feel inevitable? If not, the arc is broken.

---

### Transition Integrity

Every major handoff between ideas must answer three questions: Why are we moving here? Was the previous loop closed? Is this the natural next step?

**Example**
❌ "GraphQL reduces over-fetching. Now let's look at WebSockets."
✅ Close the loop → signal the move → land on the natural next step: "...you'd still need to poll for updates. This polling overhead is why real-time updates need a different approach. WebSockets solve this with persistent connections."

**Why it matters**
Broken transitions destroy flow.

**How to apply it**
- At each major transition, explicitly ask the three questions.
- Add closing sentences before moving to new topics.
- Transitions that feel forced need more setup.

---

### Architectural Integrity

By the end, the article should feel like one argument in a steady climb. If the conclusion feels disconnected from the introduction, the architecture has fractured.

**Example**
❌ Intro: "Database optimization is critical for performance." Conclusion: "Choose the right database for your use case." (different topics)
✅ The conclusion delivers exactly what the introduction promised.

**Why it matters**
Architectural fractures betray broken promises to readers.

**How to apply it**
- Read your introduction and conclusion together first.
- Check: does the conclusion deliver what the introduction promised?
- Look for altitude shocks (sudden complexity jumps), detours (wandering sections), or gaps (missing logical steps).

---

## 3. Teaching and Explanation

How to help readers actually learn, not just follow.

---

### Teaching, Not Pointing

Teaching means writing explanations that help readers understand what happens behind each step. It turns a walkthrough into a learning experience.

**Example**
❌ "Click 'Deploy' to start your build."
✅ "Deploy the app. This compiles your code and spins up a container on the target cluster."

**Why it matters**
Many tutorials only describe interfaces. Developers learn faster when they understand the system logic behind each action.

**How to apply it**
- Explain the reason for every step.
- Use process-focused language like "run the build command" instead of "click Build."
- Organize information: concept → process → interface.

---

### Decoupled Explanation

A decoupled explanation means teaching a concept on its own before showing how it works in a specific tool. It builds understanding that transfers beyond one product.

**Example**
❌ "In AWS Secrets Manager, click 'Create Secret.'"
✅ "A secret manager stores encrypted credentials separately from your code. In AWS, you can create one through the console or CLI."

**Why it matters**
When writing starts with concepts, readers learn principles they can transfer to other tools.

**How to apply it**
- Start by explaining the concept or system behavior.
- Bring in the tool or UI only after the reader understands the principle.

---

### Mental Model Anchoring

Mental model anchoring means linking new concepts to familiar logical structures so readers can understand them in terms of what they already know.

**Example**
❌ "Federation splits your schema into subgraphs."
✅ "Federation works like modular code. Each subgraph owns a domain, and all combine under one gateway."

**Why it matters**
Readers learn faster when they can relate a new idea to an existing pattern.

**How to apply it**
- Use analogies based on systems thinking, such as "like version control for data."
- Stick to one clear anchor per concept.
- Revisit the same anchor later to strengthen memory.

---

### Systemic Metaphor

Systemic metaphor is the use of analogies that describe how a system actually functions. It makes architecture easier to visualize without bending the technical logic.

**Example**
❌ "Grafbase is like glue that sticks APIs together."
✅ "Grafbase works like a central switchboard. Each schema plugs in, and all traffic routes through one consistent layer."

**Why it matters**
Good metaphors clarify, while weak ones distort.

**How to apply it**
- Check that the metaphor holds when the system scales or changes.
- Use analogies rooted in structure: layers, pipelines, switches.
- Retire the metaphor once the reader understands the concept.

---

### Layered Insight

Layered insight means explaining a topic across multiple levels — concept, system, and implementation — while keeping each layer distinct and connected.

**Example**
❌ "Kubernetes helps scale applications." (concept only)
✅ Concept: "Kubernetes automates container orchestration."
   System: "It uses controllers to reconcile desired and current states."
   Implementation: "Run `kubectl scale deployment` to adjust replicas dynamically."

**Why it matters**
Readers learn at different depths. Layered insight lets beginners follow the reasoning and gives experts the option to skim.

**How to apply it**
- Decide what level each paragraph serves: idea, system, or action.
- Avoid repeating the same point across layers.
- Build each section: theory → mechanism → usage.

---

## 4. Sentence Craft

How to make each line clear, concise, and purposeful.

---

### Reader Compression

Reader compression happens when a paragraph contains too many ideas at once. Reducing it means giving each sentence a single purpose.

**Example**
❌ "When configuring caching, which can be handled either by Redis or Memcached depending on deployment, make sure the TTL aligns with your invalidation policy, especially if you're using CDNs."
✅ "Use Redis or Memcached for caching. Set a TTL that matches your invalidation policy. If you use a CDN, keep both in sync."

**Why it matters**
When text feels dense, readers pause, reread, and lose trust in the explanation.

**How to apply it**
- Break long sentences at each new action or dependency.
- Avoid chaining conditions like "if," "while," or "unless" in one sentence.
- Read aloud to test clarity — if it feels heavy to say, it's heavy to read.

---

### Signal-to-Noise Density

Signal-to-noise density measures how much useful information each sentence contains. High signal means every word adds value; low noise means nothing distracts from the main idea.

**Example**
❌ "It's important to note that deploying containers consistently across environments can really help with reliability."
✅ "Consistent container deployment improves reliability."

**Why it matters**
Filler phrases weaken meaning and slow readers down.

**How to apply it**
- Remove transitions and qualifiers that don't add information.
- Cut words that change tone but not meaning.
- Use strong verbs and limit adverbs that soften statements.

**Common filler to cut:** "It's important to note that" / "In order to" / "Simply" / "Just" / "Basically" / "As mentioned earlier" / "It goes without saying"

---

### Parallel Logic

Parallel logic means keeping sentence and section structures consistent when comparing similar ideas. It creates rhythm and balance.

**Example**
❌ "Imgproxy transforms images fast. Cloudinary supports multiple formats. Vercel focuses on delivery."
✅ "Imgproxy optimizes transformations. Cloudinary manages formats. Vercel handles delivery."

**Why it matters**
Balanced structure prevents bias and confusion.

**How to apply it**
- Use the same verb form when describing alternatives.
- Match sentence length and structure across related points.
- Use symmetrical bullets or tables to maintain visual and logical balance.

---

### Show, Don't Stack

Show, don't stack means proving a concept through examples rather than listing abstract claims.

**Example**
❌ "Declarative infrastructure improves consistency, reproducibility, and scalability."
✅ "With declarative infrastructure, the same YAML file can recreate your cluster identically across regions."

**Why it matters**
Abstract benefits sound convincing but teach little.

**How to apply it**
- Support every claim with one clear example.
- Use examples drawn from realistic environments.
- Limit each paragraph to one example to keep focus.

---

### Fidelity of Examples

Fidelity of examples measures how closely a demonstration reflects real-world use. High-fidelity examples work under realistic conditions, not just in ideal or simplified setups.

**Example**
❌ "Run `docker run hello-world` to test containerization."
✅ "Run `docker run -p 8080:8080 myapp:latest` to test your build in the same network conditions as production."

**Why it matters**
Low-fidelity examples mislead readers into thinking something works universally when it only works in isolation.

**How to apply it**
- Include context about the environment, such as "in staging" or "with cache enabled."
- Use real filenames, paths, and ports.
- Test every example in a clean setup before publishing.

---

## 5. Reasoning and Argument

How to guide readers through logic and insight that feels earned.

---

### Declarative Storytelling

Declarative storytelling structures a technical piece as a series of clear, resolved statements. Each section presents one idea, proves it, and builds toward the next.

**Example**
❌ "Let's explore a few things about deployment. Then we'll talk about scaling."
✅ "Deployment defines your baseline reliability. Scaling extends that reliability under load."

**Why it matters**
Declarative storytelling creates direction by letting each claim lead naturally to the next — like dependencies in code.

**How to apply it**
- Write section headings as outcomes: "How federation isolates failure," not "About federation."
- Open each section with the main takeaway (BLUF: Bottom Line Up Front).
- Use transitions that express logic: "because," "therefore," "which means."

---

### Code-Backed Authority

Code-backed authority means supporting every claim or explanation with code, data, or output that proves it.

**Example**
❌ "imgproxy speeds up image delivery."
✅ "imgproxy reduced our average image load time from 320ms to 120ms after we offloaded transformations from the app server."

**Why it matters**
Authority in technical writing comes from proof, not adjectives.

**How to apply it**
- Use measurable data instead of descriptive praise.
- Include logs, diffs, metrics, or screenshots to demonstrate outcomes.
- Use words like "fast" or "simple" only when you can quantify them.

---

## Quick Reference: Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "In this tutorial, we will..." | Cut the preamble. Start doing. |
| "It is important to note that..." | Say the thing directly. |
| "Simply" / "Just" / "Easily" | Remove — condescending to anyone struggling |
| "Seems," "appears," "might" | Replace with what you actually observed or tested |
| Passive voice ("the function is called") | Active ("call the function") |
| Vague adjectives ("powerful," "robust," "seamless") | Replace with specifics |
| Wall-of-text code blocks with no annotation | Annotate every non-obvious line |
| Solutions before the problem is earned | Build the problem fully first |
| Sections that could be reordered without loss | Rebuild so each section depends on the last |
| Conclusions that summarize | Conclusions that extend |
| `hello-world` examples | Use real filenames, ports, and environment context |

---

## Full Editing Checklist

**Mindset**
- [ ] All technical claims verified against current documentation
- [ ] Opening leads with authority — no hedging
- [ ] Claims are specific and backed up, not adjective-driven

**Structure**
- [ ] One clear thesis before drafting
- [ ] Every section advances the thesis
- [ ] Narrative arc complete: problem → pressure → root cause → old model failure → new model → why it works → how to adopt
- [ ] All transitions answer: why here? loop closed? natural next step?
- [ ] Introduction and conclusion connect

**Teaching**
- [ ] Every step explains what happens, not just what to click
- [ ] Complex concepts introduced with context (problem first, then concept)
- [ ] Mental models or analogies used for unfamiliar abstractions
- [ ] Code examples runnable and from realistic environments

**Sentences**
- [ ] No filler phrases
- [ ] Long sentences broken at action or dependency boundaries
- [ ] Parallel structure used when comparing similar items
- [ ] Every claim has at least one concrete example

**Argument**
- [ ] The piece takes a position, not just a description
- [ ] Solutions introduced only after problems are fully established
- [ ] Evidence backs every major claim
- [ ] The ending lands on insight, not summary
