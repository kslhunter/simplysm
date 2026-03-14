# Requirements Specification — Data Processing

Add the following sections when the task involves data transformation, migration, or processing.

## Data Sources

For each input source:

| Item | Description |
|------|-------------|
| **Source** | Where the data comes from |
| **Format** | Data format (JSON, CSV, DB table, etc.) |
| **Schema** | Field definitions |

## Transformation Rules

For each transformation:

| Item | Description |
|------|-------------|
| **Input** | Source field(s) |
| **Output** | Target field(s) |
| **Rule** | How the transformation works |
| **Validation** | Conditions the data must meet |

## Output

| Item | Description |
|------|-------------|
| **Destination** | Where the processed data goes |
| **Format** | Output format |
| **Schema** | Field definitions |

## Error Handling

How to handle invalid/malformed data: skip, reject, default value, etc.
