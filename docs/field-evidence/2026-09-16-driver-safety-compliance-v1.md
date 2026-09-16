# TachoCommand Driver Safety / Compliance Engine v1

Date: 2026-09-16

## Product principle

TachoCommand separates **operational safety warnings** from **legal infringement classification**.

A driver must get useful early warnings even when the exact legal scope is not yet known, but the application must never label an event as a legal infringement under the wrong regime.

## v1 cockpit behavior

### Continuous driving

- **4 h 15 min**: amber operational warning — "15 min to the 4 h 30 driving threshold".
- **4 h 30 min**: legal limit reached under the standard EU 561/2006 profile; the first minute beyond that threshold becomes an infringement candidate.
- A qualifying 45-minute break resets the accumulated driving period.
- The standard split is modelled as a break of at least 15 minutes followed by one of at least 30 minutes.
- Other work and availability do not reset Article 7 driving accumulation.

The 4 h 15 alert is a TachoCommand product threshold, not itself a statutory infringement threshold.

## Legal-scope gate

Profiles in v1:

1. `unknown`
   - operational warnings remain active;
   - legal infringement verdicts are suppressed;
   - UI must ask for/select the applicable regime.

2. `eu-561-standard`
   - Article 7 continuous-driving limit is evaluated;
   - 56-hour calendar-week driving limit is evaluated;
   - 90-hour two-consecutive-week driving limit is evaluated.

3. `regular-passenger-le-50km`
   - EU 561/2006 legal verdicts are disabled;
   - UI states that the relevant national rules profile is required.

This scope gate is essential for bus operations because Regulation (EC) 561/2006 Article 3(a) excludes vehicles used for regular passenger services where the route covered by the service does not exceed 50 km. The CJEU has clarified that this refers to the specified route between its endpoints, not the driver's accumulated kilometres during the duty.

## Driver overview — intended information architecture

The production cockpit should eventually show, in priority order:

- continuous driving since qualifying break;
- countdown to the next break threshold;
- state of split break (e.g. first 15 min credited, 30 min still required);
- current activity: DRIVING / WORK / AVAILABILITY / REST;
- today / current driving-period driving time;
- 9 h daily driving budget and whether a 10 h extension is available;
- current calendar-week driving versus 56 h;
- two-consecutive-week driving versus 90 h;
- next daily-rest deadline;
- reduced-daily-rest usage between weekly rests;
- weekly-rest status and compensation obligations;
- working-time / 6-hour break warnings where the applicable national implementation is known;
- data-quality warnings: missing card periods, unknown activity, manual-entry gaps;
- historical infringement candidates with exact date/time and rule basis;
- clearly separated "warning", "limit", "candidate infringement", and "confirmed by authority" semantics.

## Explicitly not yet classified in v1

- 9 h / 10 h daily driving and twice-per-week extension accounting;
- daily rest 9 h / 11 h and split 3 + 9 h;
- maximum three reduced daily rests between weekly rests;
- weekly rest 45 h / reduced 24 h plus compensation;
- six-24-hour weekly-rest deadline;
- multi-manning rules;
- ferry/train derogations;
- occasional passenger-service derogations;
- Article 12 exceptional deviations;
- national rules for regular passenger routes <=50 km;
- working-time and night-work conclusions under national transposition.

Those rules require their own state machines and/or legal-scope context; they must not be guessed from the raw activity stream.

## Source basis

Primary legal basis checked on 2026-09-16:

- Regulation (EC) No 561/2006, consolidated text:
  - Article 3(a): regular passenger routes <=50 km excluded from scope;
  - Article 6: 9 h daily / twice-weekly 10 h, 56 h weekly, 90 h two-week driving;
  - Article 7: 4.5 h driving then 45 min break; standard split 15 + 30;
  - Article 8: daily and weekly rest framework.
- Directive 2002/15/EC:
  - Article 4: average 48 h working week, up to 60 h subject to averaging;
  - Article 5: no more than 6 consecutive working hours without a break; 30/45 min totals depending on working hours;
  - Article 7: night-work framework, subject to national definition/transposition.

## Regression coverage

Synthetic tests verify:

1. 4 h 15 warning does not become a legal infringement;
2. 4 h 30 exactly is not exceeded; minute 271 is;
3. 45-minute rest resets accumulation;
4. 15 + 30 split reset works;
5. work/availability do not reset driving accumulation;
6. <=50 km regular-passenger profile suppresses EU legal verdicts;
7. unknown profile suppresses legal verdicts;
8. 56 h weekly and 90 h consecutive-two-week calculations.
