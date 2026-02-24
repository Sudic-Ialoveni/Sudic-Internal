# External API variable mapping

This document maps **n8n-node-amocrm** operations ([GitHub](https://github.com/yatolstoy/n8n-node-amocrm)) to our **get_external_value** paths. Our layer is read-only (get/list); create/update are not exposed as variables.

## Same info as n8n operation → Resolve path

| n8n resource | n8n operation | Our resolve path (same data) |
|--------------|----------------|------------------------------|
| **Account** | Get Info | `amocrm.account` |
| **Lead** | Get Lead List | `amocrm.leads_list` (optional params: `limit`, `page`, `query`) |
| **Lead** | Get single lead | `amocrm.lead(123)` or `amocrm.lead(123).field_name` |
| **Contact** | Get Contacts List | `amocrm.contacts_list` (optional: `limit`, `page`, `query`) |
| **Contact** | Get single contact | `amocrm.contact(456)` or `amocrm.contact(456).name` |
| **Company** | Get Companies List | `amocrm.companies_list` (optional: `limit`, `page`, `query`) |
| **Company** | Get single company | `amocrm.company(789)` or `amocrm.company(789).name` |
| **Task** | Get Task List | `amocrm.tasks_list` or `amocrm.tasks` (optional: `filter_date_from`, `filter_date_to`, `filter_is_completed`, `filter_task_type_id`, `limit`, `page`) |
| **Task** | Get single task | `amocrm.task(123)` or `amocrm.task(123).task_type_id` |
| **Note** | Get notes | `amocrm.notes_list` or `amocrm.notes` (optional: `filter_entity_id`, `filter_entity_type`, `limit`, `page`) |
| **Note** | Get single note | `amocrm.note(123)` |
| **Catalog** | Get Catalogs | `amocrm.catalogs_list` or `amocrm.catalogs` (optional: `limit`, `page`) |
| **Catalog** | Get single catalog | `amocrm.catalog(123)` |
| **Catalog** | Get Catalog Elements | `amocrm.catalog_elements(123)` where `123` is the catalog ID (optional: `limit`, `page`, `query`) |

## Example: same as “Get Task List” in n8n

To get the **same info as n8n’s “Task → Get Task List”** (list of tasks), use:

- **Path:** `amocrm.tasks_list` or `amocrm.tasks`
- **Optional params:**  
  - `filter_date_from`, `filter_date_to` — for “today’s tasks” use the same date in `YYYY-MM-DD` or Unix timestamp.  
  - `filter_is_completed` — `0` or `1`  
  - `filter_task_type_id` — task type ID(s)  
  - `limit`, `page` — pagination  

Example for today’s tasks:

```json
{
  "path": "amocrm.tasks_list",
  "params": {
    "filter_date_from": "2026-02-24",
    "filter_date_to": "2026-02-24"
  }
}
```

Or in the AI tool: `get_external_value({ path: "amocrm.tasks_list", params: { filter_date_from: "2026-02-24", filter_date_to: "2026-02-24" } })`.

## Full variable list

The **Dev → External API** debug page in the app lists all variables with descriptions and example paths.
