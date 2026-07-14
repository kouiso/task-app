---
name: technical-writing-best-practices
description: Apply technical writing best practices when producing or editing developer-facing content. Use this skill whenever the user asks to write, edit, review, or improve a technical blog post, tutorial, guide, API doc, or any content written for a developer audience. Also trigger when the user asks for feedback on tone, clarity, structure, argument quality, transitions, or examples in technical writing. Invoke proactively for any content targeting developers — don't wait for the user to specifically mention "best practices."
---

# Technical Writing Best Practices

This skill encodes proven principles for writing clear, confident, and technically credible content for developer audiences. Apply all five sections before writing; reference specific entries during editing.

**Five domains:**
1. [Writing Mindset](#1-writing-mindset) — How to think like a technical communicator
2. [Structure and Flow](#2-structure-and-flow) — How to organize ideas so they move naturally
3. [Teaching and Explanation](#3-teaching-and-explanation) — How to help readers learn, not just follow
4. [Sentence Craft](#4-sentence-craft) — How to make each line clear, concise, and purposeful
5. [Reasoning and Argument](#5-reasoning-and-argument) — How to guide readers through logic that feels earned

See the [Application Checklist](#application-checklist) and [Anti-Patterns](#common-anti-patterns) at the bottom before finalizing any piece.

For the full glossary with detailed examples, see `technical-writing-style-guide.md`.

---

## 1. Writing Mindset

### Learning Posture
Approach every topic with curiosity, even familiar ones. Every draft or revision can reveal something new about the subject or the reader.

❌ "I've written enough API docs to know how this should sound."
✅ "Let's check the latest API behavior. It might have changed since our last piece."

**Apply it:** Re-verify technical claims even in familiar areas. Collaborate with engineers or PMs to refresh context before publishing.

---

### Lead with Authority
Present insight first, then use evidence to support it. Start from what you know, not what you've read.

❌ "I read that developers prefer YAML because it's simpler."
✅ "Developers often prefer YAML for its readability and support for multi-line configuration."

**Apply it:** State your main idea first, then link supporting research. Use citations to reinforce knowledge, not replace it.

---

### Technical Conviction
Write from understanding. Show that you know how something works because you've used or tested it. Avoid uncertain language like "seems," "appears," or "might."

❌ "Grafbase seems to make federated schemas easier."
✅ "Grafbase unifies federated schemas under a single router layer."

**Apply it:** Use phrases like "in our test setup" instead of "in general." Replace speculation with measurable outcomes. Check that every statement can be confirmed in code or configuration.

---

### Credibility Through Restraint
Communicate with precision and stop where evidence ends. Let results speak for themselves. Exaggeration weakens trust; clear, measured language builds it.

❌ "Bitcloud completely redefines composable AI workflows."
✅ "Bitcloud lets developers generate, version, and reuse components across AI workflows."

**Apply it:** Replace broad claims with concrete outcomes. Avoid absolute words like "always," "never," or "completely." Demonstrate value through examples, not declarations.

---

## 2. Structure and Flow

### Instructional Flow
The sequence that helps readers move from concept → setup → execution → validation.

❌ "You can deploy this on Kubernetes. Pods are grouped into namespaces. Services expose ports. Let's build an image."
✅ "You'll deploy this on Kubernetes. First, package the app into an image. Then, create a namespace and expose it with a Service."

**Apply it:** Use sequence cues only when they add clarity. Group related steps under clear headers. Run the tutorial from a blank environment before publishing.

---

### Assertive Transitions
Link ideas with clear reasoning. Explain why the next section follows — show logic, not just sequence.

❌ "In conclusion, let's now move to setup."
✅ "Before deployment, you need a stable config environment. Let's set that up next."

**Apply it:** Use causal connectors ("because," "so," "which means"). Never use "furthermore" or "as mentioned earlier" as filler.

---

### Semantic Hierarchy
Organize content so readers can see the structure of ideas at a glance. Concept before details; principles before actions.

✅ Layered structure: **Concept** (what's happening) → **Reason** (why) → **Action** (what to do)

**Apply it:** Use clear, consistent heading levels. Keep explanations separate from instructions. Open each major section with a single declarative idea.

---

### Cognitive Pacing
Manage mental load by balancing dense information with moments of simplicity.

❌ One sentence with six interconnected ideas.
✅ Break it into two sentences: the what, then the implications.

**Apply it:** Alternate between detailed and simple sentences. Break paragraphs before information gets heavy. Introduce the idea first, then its nuances.

---

### Compositional Coherence
Every paragraph, subheading, and example should connect to one central argument. Keep tone, logic, and structure aligned throughout.

**Apply it:** Write one clear thesis before drafting. Keep tone consistent — don't mix instructional and promotional within the same section.

---

### The Thesis Spine
The core argument that runs through the entire article, stated in one sentence. Every section must reinforce or extend this central claim.

**Apply it:** State your thesis in one sentence before drafting. After writing each section, ask: "Does this serve the thesis?" Remove or reframe anything that drifts.

---

### Directional Movement
Each section should depend on the previous one and push the reader forward, not sideways.

❌ Sideways: three parallel facts with no progression.
✅ Forward: each section creates the problem the next one solves.

**Apply it:** Ask at each transition: "Does this idea need what came before?" If a section stands alone, cut or rebuild the sequence.

---

### Signaled Level Shifts
Transitions between modes (story → theory, theory → product, problem → solution) must be explicitly signaled.

**Apply it:** Watch for these shifts: story→theory, theory→product, abstract→concrete. Use phrases like "This is why," "Here's how that translates," or "In practice, this means."

---

### Introduced Abstractions
Every new concept must be set up before it's explained. Readers need to know why a concept matters before being asked to understand it.

**Apply it:** Before any technical concept, establish the problem it solves. Ask: "Have I earned the right to introduce this idea?"

---

### Continuous Context
Context must flow from one paragraph to the next. Thread drops break orientation.

**Apply it:** After each paragraph, check: does the next paragraph connect? Look for paragraphs that could be removed without affecting flow — that's a context break.

---

### Thesis Integrity
Every section must serve the core argument. Interesting tangents that don't advance the thesis should be cut.

**Apply it:** Ask of each section: "Does this serve my core claim?" Be ruthless.

---

### Earned Solutions
Establish, deepen, and clarify the problem fully before presenting the fix.

**Apply it:** Write the problem section fully first. Ask: "Have I shown why this is hard?" and "Have I demonstrated the stakes?" Only then introduce the solution.

---

### Narrative Arc
Technical articles follow a clear arc: **problem → pressure → root cause → failure of old model → emergence of new model → why it works → how to adopt it.**

**Apply it:** Map your draft against all arc components. Test: does the conclusion feel inevitable? If not, the arc is broken.

---

### Transition Integrity
Every major handoff must answer three questions: Why are we moving here? Was the previous loop closed? Is this the natural next step?

**Apply it:** At each major transition, explicitly ask the three questions. Transitions that feel forced need more setup.

---

### Architectural Integrity
The conclusion must resolve the opening tension. If it feels disconnected from the introduction, the architecture has fractured.

**Apply it:** Read your intro and conclusion together first. Look for altitude shocks, detours, or logical gaps.

---

## 3. Teaching and Explanation

### Teaching, Not Pointing
Write explanations that show what happens behind each step. Turn a walkthrough into a learning experience.

❌ "Click 'Deploy' to start your build."
✅ "Deploy the app. This compiles your code and spins up a container on the target cluster."

**Apply it:** Explain the reason for every step. Organize: concept → process → interface.

---

### Decoupled Explanation
Teach a concept on its own before showing how it works in a specific tool. Builds transferable understanding.

**Apply it:** Start with the concept or system behavior. Bring in the specific tool only after the reader understands the principle.

---

### Mental Model Anchoring
Link new concepts to familiar logical structures so readers understand them in terms of what they already know.

❌ "Federation splits your schema into subgraphs."
✅ "Federation works like modular code. Each subgraph owns a domain, and all combine under one gateway."

**Apply it:** Use analogies based on systems thinking. Stick to one clear anchor per concept.

---

### Systemic Metaphor
Use analogies that describe how a system actually functions — not just what it resembles.

❌ "Grafbase is like glue that sticks APIs together."
✅ "Grafbase works like a central switchboard. Each schema plugs in, and all traffic routes through one consistent layer."

**Apply it:** Check that the metaphor holds when the system scales. Retire it once the reader understands the concept.

---

### Layered Insight
Explain a topic across multiple levels — concept, system, implementation — while keeping each layer distinct.

✅ Concept → System (how it works internally) → Implementation (the command to run)

**Apply it:** Build each section: theory → mechanism → usage. Avoid repeating the same point across layers.

---

## 4. Sentence Craft

### Reader Compression
Each sentence should have a single purpose. Too many ideas in one sentence forces readers to reread.

**Apply it:** Break long sentences at each new action or dependency. Read aloud — if it's heavy to say, it's heavy to read.

---

### Signal-to-Noise Density
Every word should add value. Filler weakens meaning and slows readers down.

❌ "It's important to note that deploying containers consistently across environments can really help with reliability."
✅ "Consistent container deployment improves reliability."

**Filler to cut:** "It's important to note that" / "In order to" / "Simply" / "Just" / "Basically" / "As mentioned earlier"

---

### Parallel Logic
Keep sentence and section structures consistent when comparing similar ideas.

❌ "Imgproxy transforms images fast. Cloudinary supports multiple formats. Vercel focuses on delivery."
✅ "Imgproxy optimizes transformations. Cloudinary manages formats. Vercel handles delivery."

**Apply it:** Use the same verb form when describing alternatives. Match sentence length across related points.

---

### Show, Don't Stack
Prove a concept through one concrete example rather than listing abstract claims.

❌ "Declarative infrastructure improves consistency, reproducibility, and scalability."
✅ "With declarative infrastructure, the same YAML file can recreate your cluster identically across regions."

---

### Fidelity of Examples
Examples should reflect real-world use, not idealized setups.

❌ "Run `docker run hello-world` to test containerization."
✅ "Run `docker run -p 8080:8080 myapp:latest` to test your build in the same network conditions as production."

**Apply it:** Use real filenames, paths, and ports. Test every example in a clean setup before publishing.

---

## 5. Reasoning and Argument

### Declarative Storytelling
Structure each piece as a series of clear, resolved statements. Each section presents one idea, proves it, and builds toward the next.

❌ "Let's explore a few things about deployment. Then we'll talk about scaling."
✅ "Deployment defines your baseline reliability. Scaling extends that reliability under load."

**Apply it:** Write section headings as outcomes. Open each section with the main takeaway (BLUF). Use transitions that express logic: "because," "therefore," "which means."

---

### Code-Backed Authority
Support every claim with code, data, or output that proves it. Authority comes from proof, not adjectives.

❌ "imgproxy speeds up image delivery."
✅ "imgproxy reduced our average image load time from 320ms to 120ms after we offloaded transformations from the app server."

**Apply it:** Use measurable data instead of descriptive praise. Only use words like "fast" or "simple" when you can quantify them.

---

## Application Checklist

**Mindset**
- [ ] All technical claims verified against current documentation
- [ ] Opening leads with authority — no hedging
- [ ] Claims are specific and backed up, not adjective-driven

**Structure**
- [ ] One clear thesis stated before drafting
- [ ] Every section advances the thesis — no drift
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

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "In this tutorial, we will..." | Cut the preamble. Start doing. |
| "It is important to note that..." | Say the thing directly. |
| "Simply" / "Just" / "Easily" | Remove — condescending to anyone struggling |
| "Seems," "appears," "might" | Replace with what you actually observed or tested |
| Passive voice ("the function is called") | Active ("call the function") |
| Vague adjectives ("powerful," "robust," "seamless") | Replace with specifics |
| Wall-of-text code blocks | Annotate every non-obvious line |
| Solutions before the problem is earned | Build the problem fully first |
| Sections that could be reordered without loss | Rebuild so each section depends on the last |
| Conclusions that summarize | Conclusions that extend |
| `hello-world` examples | Use real filenames, ports, and environment context |
