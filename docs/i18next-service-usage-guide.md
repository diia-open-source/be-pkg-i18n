# I18nextService Usage Guide

## Overview

The I18nextService is a localization service from the `@diia-inhouse/i18n` package that provides internationalization capabilities Example by: Vehicle Re-Registration Service. It enables type-safe translation management with namespace support and is used throughout the application for UI tex and user-facing content.

## Setup and Configuration

### Dependency Injection

The I18nextService is configured as a singleton in the dependency injection container:

```typescript
// src/deps.ts
import { I18nextService } from '@diia-inhouse/i18n'

export default async (config: AppConfig): ReturnType<DepsFactoryFn<AppConfig, AppDeps>> => {
    return {
        // ... other dependencies
        i18next: asClass(I18nextService).singleton(),
        // ... other dependencies
    }
}
```

### Interface Definition

The service is defined in the application dependencies interface:

```typescript
// src/interfaces/deps.ts
import { I18nextService } from '@diia-inhouse/i18n'

export interface AppDeps {
    // ... other dependencies
    i18next: I18nextService
    // ... other dependencies
}
```

## Locale Structure

### Directory Organization

Locales are organized in a hierarchical structure under `src/locales/`:

```
src/locales/
└── uk/                                    # Ukrainian locale
    └── replacementVehicleLicense/         # Feature-specific translations
        ├── applicationPdf.json
        ├── confirmation.json
        // ... other
```

### Type Definitions

Each locale file has a corresponding TypeScript type definition:

```typescript
// src/interfaces/locales.ts
import localesReplacementVehicleLicenseReasons from '@src/locales/uk/replacementVehicleLicense/reasons.json'

export type LocalesReplacementVehicleLicenseReasons = typeof localesReplacementVehicleLicenseReasons
export type LocalesReplacementVehicleLicenseDelivery = typeof localesReplacementVehicleLicenseDelivery
// ... other locale types
```

### Example Locale File

src/locales/uk/replacementVehicleLicense/reasons.json

```json
{
    "body.titleLabelMlc.label": "Причина заміни",
    "body.radioBtnGroupOrg.items.losing.radioBtnMlc.label": "Втрата",
    "body.radioBtnGroupOrg.items.damaging.radioBtnMlc.label": "Пошкодження",
    "body.radioBtnGroupOrg.items.licensePlatesChanging.radioBtnMlc.label": "Заміна номерного знака",
    "body.radioBtnGroupOrg.items.dataChanging.radioBtnMlc.label": "Зміна персональних даних",
    "body.radioBtnGroupOrg.items.digital.radioBtnMlc.label": "Зміна на цифровий",
    "body.radioBtnGroupOrg.items.digital.radioBtnMlc.description": "Ваш фізичний техпаспорт стане недійсним",
    "bottomGroup.bottomGroupOrg.btnPrimaryDefaultAtm.label": "Далі"
}
```

## Basic Usage Patterns

### 1. Service Injection and Namespace Setup

```typescript
import { I18nextService, TranslationFunction } from '@diia-inhouse/i18n'

import { LocalesReplacementVehicleLicenseReasons } from '@interfaces/locales'

export default class DictionaryService {
    private readonly t: TranslationFunction<LocalesReplacementVehicleLicenseReasons>

    constructor(private readonly i18next: I18nextService) {
        // Create a namespaced translation function
        this.t = this.i18next.ns<LocalesReplacementVehicleLicenseReasons>('replacementVehicleLicense/reasons')
    }
}
```

### 2. Building UI Components with Translations

```typescript
export default class ReplacementVehicleLicenseDeliveryService {
    private readonly t: TranslationFunction<LocalesReplacementVehicleLicenseDelivery>

    constructor(private readonly i18next: I18nextService) {
        this.t = this.i18next.ns<LocalesReplacementVehicleLicenseDelivery>('replacementVehicleLicense/delivery')
    }

    private get deliveryTypeItems(): RadioBtnMlc[] {
        return [
            {
                componentId: VehicleLicenseDeliveryType.PostOffice,
                id: VehicleLicenseDeliveryType.PostOffice,
                label: this.t('body.radioBtnGroupOrg.items.postOffice.radioBtnMlc.label'),
                description: this.appUtils.getFormattedPrice(
                    this.config.replacementVehicleLicense.delivery.prices.postOffice,
                    Units.Hryvnia,
                ),
            },
            {
                componentId: VehicleLicenseDeliveryType.Courier,
                id: VehicleLicenseDeliveryType.Courier,
                label: this.t('body.radioBtnGroupOrg.items.courier.radioBtnMlc.label'),
                description: this.appUtils.getFormattedPrice(this.config.replacementVehicleLicense.delivery.prices.courier, Units.Hryvnia),
            },
        ]
    }
}
```

## Advanced Usage Patterns

### 1. Multiple Namespaces in One Service

```typescript
export default class MultiNamespaceService {
    private readonly reasonsT: TranslationFunction<LocalesReplacementVehicleLicenseReasons>
    private readonly deliveryT: TranslationFunction<LocalesReplacementVehicleLicenseDelivery>

    constructor(private readonly i18next: I18nextService) {
        this.reasonsT = this.i18next.ns<LocalesReplacementVehicleLicenseReasons>('replacementVehicleLicense/reasons')
        this.deliveryT = this.i18next.ns<LocalesReplacementVehicleLicenseDelivery>('replacementVehicleLicense/delivery')
    }

    buildComplexUI() {
        return {
            title: this.reasonsT('body.titleLabelMlc.label'),
            deliveryOptions: this.deliveryT('body.radioBtnGroupOrg.title'),
        }
    }
}
```

### 2. Dynamic Translation Key Building

```typescript
export default class DynamicTranslationService {
    private readonly t: TranslationFunction<LocalesReplacementVehicleLicenseReasons>

    constructor(private readonly i18next: I18nextService) {
        this.t = this.i18next.ns<LocalesReplacementVehicleLicenseReasons>('replacementVehicleLicense/reasons')
    }

    getReasonLabel(reason: ReplacementVehicleLicenseReason): string {
        const keyMap: Record<ReplacementVehicleLicenseReason, string> = {
            [ReplacementVehicleLicenseReason.Losing]: 'body.radioBtnGroupOrg.items.losing.radioBtnMlc.label',
            [ReplacementVehicleLicenseReason.Damaging]: 'body.radioBtnGroupOrg.items.damaging.radioBtnMlc.label',
            [ReplacementVehicleLicenseReason.Digital]: 'body.radioBtnGroupOrg.items.digital.radioBtnMlc.label',
        }

        return this.t(keyMap[reason])
    }
}
```

## Best Practices

### 1. Namespace Organization

- **Feature-based namespaces**: Organize translations by feature (e.g., `replacementVehicleLicense/reasons`)
- **Hierarchical structure**: Use nested JSON objects to group related translations
- **Consistent naming**: Follow a consistent naming convention for translation keys

### 2. Type Safety

- **Always use typed translation functions**: Use `TranslationFunction<T>` with proper locale types
- **Import locale types**: Create and import TypeScript types for each locale file
- **Namespace-specific types**: Use specific locale types for each namespace

### 3. Translation Key Structure

```typescript
// Good: Hierarchical and descriptive by design system
'body.radioBtnGroupOrg.items.losing.radioBtnMlc.label'

// Bad: Flat and unclear
'losingLabel'
```
