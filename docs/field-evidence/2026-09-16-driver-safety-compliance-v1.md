# TachoCommand Driver Safety / Compliance Engine v1

Date: 2026-09-16

## Product principle

TachoCommand separates **operational safety warnings** from **legal infringement classification**.

A driver must get useful early warnings even when the exact legal scope is not yet known, but the application must never label an event as a legal infringement under the wrong regime.

## v1 cockpit behavior

### EU 561 standard continuous driving

- **4 h 15 min**: amber operational warning — "15 min to the 4 h 30 driving threshold".
- **4 h 30 min**: legal limit reached under the standard EU 561/2006 profile; the first minute beyond that threshold becomes an infringement candidate.
- A qualifying 45-minute break resets the accumulated driving period.
- The standard split is modelled as a break of at least 15 minutes followed by one of at least 30 minutes.
- Other work and availability do not reset Article 7 driving accumulation.

The 4 h 15 alert is a TachoCommand product threshold, not itself a statutory infringement threshold.

### Austria — regional regular passenger service, route <= 50 km

The Austrian 2026 private-autobus collective agreement and the Austrian Working Time Act national regime are treated as a separate rule pack, not as EU 561 Article 7.

For the currently implemented break rule:

- **3 h 45 min**: TachoCommand amber operational warning — 15 minutes before the national/KV 4-hour driving threshold;
- **4 h 00 min**: driving threshold reached; the first minute beyond it becomes an Austrian-profile infringement candidate;
- one continuous break of **at least 30 minutes** resets the driving accumulation;
- therefore 30, 40 and 45 minutes each qualify as a full single break;
- alternatively, **2 x at least 20 minutes** qualifies;
- alternatively, **3 x at least 15 minutes** qualifies;
- an incomplete split does not reset the driving accumulation;
- WORK and AVAILABILITY do not count as a Lenkpause.

Only this Austrian continuous-driving/break rule is enabled in v1. Other Austrian national details are intentionally left unclassified until separately sourced and modelled.

Primary current sources checked 2026-09-16:

- WKO, Bundes-Kollektivvertrag Autobusbetriebe, valid from 1 January 2026, section III.2.d.2: regional Kraftfahrlinienverkehr up to 50 km — maximum 4 h driving, minimum 30 min break, replaceable by 2 x 20 or 3 x 15;
- Austrian Arbeitszeitgesetz (AZG), current 2026 consolidated text, § 15: after no more than 4 h driving, at least 30 min Lenkpause under the national rule.

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

4. `at-regional-passenger-le-50km`
   - Austrian 4 h / 30 min continuous-driving rule is active;
   - accepted break patterns in v1: 30+ continuous, 2 x 20, or 3 x 15;
   - 3 h 45 is a TachoCommand preventive warning;
   - no EU 4 h 30 / 15+30 logic is applied to this profile;
   - other Austrian daily/weekly-rest and national working-time conclusions remain out of scope until separately modelled.

This scope gate is essential for bus operations because Regulation (EC) 561/2006 Article 3(a) excludes vehicles used for regular passenger services where the route covered by the service does not exceed 50 km. The CJEU has clarified that this refers to the specified route between its endpoints, not the driver's accumulated kilometres during the duty.

## Driver overview — intended information architecture

The production cockpit should eventually show, in priority order:

- active legal/rule profile;
- continuous driving since qualifying break;
- countdown to the next break threshold;
- break-credit state appropriate to the selected profile;
- current activity: DRIVING / WORK / AVAILABILITY / REST;
- today / current driving-period driving time;
- 9 h daily driving budget and whether a 10 h extension is available where applicable;
- current calendar-week driving versus applicable limit;
- two-consecutive-week driving versus applicable limit;
- next daily-rest deadline;
- reduced-daily-rest usage between weekly rests;
- weekly-rest status and compensation obligations;
- working-time / 6-hour break warnings where the applicable national implementation is known;
- data-quality warnings: missing card periods, unknown activity, manual-entry gaps;
- historical infringement candidates with exact date/time and rule basis;
- clearly separated "warning", "limit", "candidate infringement", and "confirmed by authority" semantics.

## Explicitly not yet classified in v1

- EU 9 h / 10 h daily driving and twice-per-week extension accounting;
- daily rest 9 h / 11 h and split 3 + 9 h;
- maximum three reduced daily rests between weekly rests;
- weekly rest 45 h / reduced 24 h plus compensation;
- six-24-hour weekly-rest deadline;
- multi-manning rules;
- ferry/train derogations;
- occasional passenger-service derogations;
- Article 12 exceptional deviations;
- Austrian national daily/weekly-rest and compensation details beyond the implemented <=50 km Lenkpause rule;
- working-time and night-work conclusions under national transposition.

Those rules require their own state machines and/or legal-scope context; they must not be guessed from the raw activity stream.

## Source basis

Primary legal basis checked on 2026-09-16:

- Regulation (EC) No 561/2006, consolidated text:
  - Article 3(a): regular passenger routes <=50 km excluded from scope;
  - Article 6: 9 h daily / twice-weekly 10 h, 56 h weekly, 90 h two-week driving;
  - Article 7: 4.5 h driving then 45 min break; standard split 15 + 30;
  - Article 8: daily and weekly rest framework.
- Austrian Arbeitszeitgesetz, current 2026 consolidated text:
  - § 15: national 4 h / 30 min Lenkpause framework.
- WKO Bundes-Kollektivvertrag Autobusbetriebe, valid from 1 January 2026:
  - regional Kraftfahrlinienverkehr <=50 km: 4 h driving; 30 min break or 2 x 20 / 3 x 15.
- Directive 2002/15/EC:
  - Article 4: average 48 h working week, up to 60 h subject to averaging;
  - Article 5: no more than 6 consecutive working hours without a break; 30/45 min totals depending on working hours;
  - Article 7: night-work framework, subject to national definition/transposition.

## Regression coverage

Synthetic tests verify:

1. EU 4 h 15 warning does not become a legal infringement;
2. EU 4 h 30 exactly is not exceeded; minute 271 is;
3. 45-minute EU rest resets accumulation;
4. EU 15 + 30 split reset works;
5. work/availability do not reset EU driving accumulation;
6. generic <=50 km regular-passenger profile suppresses EU legal verdicts;
7. unknown profile suppresses legal verdicts;
8. 56 h weekly and 90 h consecutive-two-week calculations;
9. Austrian <=50 km profile warns at 3 h 45 and exceeds only after 4 h;
10. Austrian profile accepts 30, 40 and 45 minute single breaks;
11. Austrian profile accepts 2 x 20;
12. Austrian profile accepts 3 x 15;
13. Austrian profile does not reset on an incomplete split.
