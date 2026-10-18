## Source

Frederick P. Brooks Jr., *No Silver Bullet: Essence and Accidents of Software Engineering*. University of North Carolina at Chapel Hill, technical report TR86-020, September 1986. [Original report](https://www.cs.unc.edu/techreports/86-020.pdf).

Section references below follow the supplied report.

## Problem

Software projects overrun budgets and schedules even as computers become cheaper and faster. Brooks asks whether a single technology or management technique can produce a tenfold improvement in software productivity, reliability or simplicity within the next decade. His answer is skeptical, but he expects sustained progress from several improvements used together (Section 1).

## Essential and accidental difficulty

- **Essential difficulty** belongs to the system being designed: deciding what it must do, how its parts relate, and whether the design is consistent and correct.
- **Accidental difficulty** comes from expressing that design with particular languages, tools and machines. It includes implementation burdens that are avoidable in principle; "accidental" does not mean a mistake.

Brooks argues that specifying, designing and testing the conceptual system account for the hardest work. Making its expression easier leaves that work to be done (Section 2).

He identifies four properties behind the essential difficulty:

| Property | Why it makes software hard |
| :------- | :------------------------ |
| Complexity | Distinct parts interact, so adding functionality increases the relationships and states that developers must understand. Repeating identical components does not explain most software growth. |
| Conformity | Software must fit existing interfaces, institutions and rules. Their inconsistencies cannot all be removed by redesigning the software alone. |
| Changeability | Useful software attracts requests for new uses and must adapt as users, laws and hardware change. |
| Invisibility | Control flow, data flow, dependencies and other relationships require different views. No single spatial diagram captures the whole system. |

These properties affect communication and maintenance as well as implementation (Sections 2.1 to 2.4).

## Why better tools have limits

High-level languages removed machine-level bookkeeping. Time-sharing reduced interruptions while waiting for a computer. Integrated environments made tools work together through shared formats and interfaces. Brooks treats these as major gains against accidental difficulty, each with a limit once its particular overhead is removed (Section 3).

He applies the same test to proposed breakthroughs (Section 4):

- Object-oriented programming helps express abstractions and hide representation details, but the designer still has to choose the abstractions.
- Automatic programming works well in restricted domains with clear parameters and known solution methods. General software requirements rarely have that form.
- Graphical programming cannot turn every relationship in a software system into one readable picture.
- Program verification can establish agreement with a specification. Establishing that the specification describes the right system remains difficult, and verification does not eliminate testing.
- AI and expert systems can spread experienced programmers' knowledge. Acquiring and encoding that knowledge is itself difficult.

The abstract's argument about removing overhead is a hypothetical limit on total improvement. It does not measure how developers divide their time between essential and accidental work.

## What Brooks recommends

1. **Buy when a suitable product exists.** Reusing an available product avoids developing its functionality again. Applicability to the user's task is the deciding constraint (Section 5.1).
2. **Refine requirements through prototypes.** Clients and developers discover missing requirements by trying a working approximation. Iteration belongs in system definition, rather than being treated as a failure to specify everything initially (Section 5.2).
3. **Grow a running system incrementally.** Start with a working skeleton and replace stubs with functioning parts. Keep the system runnable as capabilities are added, allowing feedback and backtracking (Section 5.3).
4. **Develop strong designers.** Identify design talent early, provide mentoring and apprenticeships, and reward technical careers comparably to management careers (Section 5.4).

## Caveats

This is an argument supported by examples, cited work and Brooks's experience. It contains no controlled evaluation of the proposed improvements and no measurement establishing the essential share of development effort.

Its forecast and technology assessments belong to 1986. The AI discussion concerns the definitions and expert systems considered then; applying its conclusions to current AI tools requires new evidence.

My reading: assess an engineering tool by which part of the work it removes. Faster implementation helps, but requirements discovery, interface decisions and validation need attention of their own. That is a practical inference from the argument, not an experimental result.
