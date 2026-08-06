---
name: Step order
description: Contact information is the first form step after account type in every flow
type: feature
---
Contact information comes first, immediately after the account-type selection, for all flows (professional, salon, student).

Order after account-type:
- professional: contact-basics, business-operation, create-password, business-location, license, preferred-method, monthly-order-volume, preferences
- salon: contact-basics, business-location, create-password, license, preferred-method, monthly-order-volume, preferences
- student: contact-basics, school-info, create-password, preferred-method, preferences

Auto-advance from steps must use `goToNextStep()`, never hardcode the next step name.
