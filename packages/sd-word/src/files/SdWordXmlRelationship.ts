import { ISdWordRelationshipData, ISdWordXml, ISdWordXmlRelationshipData } from "../commons";
import { NumberUtil } from "@simplysm/sd-core-common";

export class SdWordXmlRelationship implements ISdWordXml {
  public readonly data: ISdWordXmlRelationshipData;

  public get lastId(): number | undefined {
    return this.data.Relationships.Relationship?.max((rel) => this.getRelId(rel));
  }

  private getRelId(rel: ISdWordRelationshipData): number {
    return NumberUtil.parseInt((/[0-9]*$/).exec(rel.$.Id)![0])!;
  }

  public constructor(data?: ISdWordXmlRelationshipData) {
    if (data === undefined) {
      this.data = {
        "Relationships": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/package/2006/relationships"
          }
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public add(target: string, type: string): this {
    this.data.Relationships.Relationship = this.data.Relationships.Relationship ?? [];

    const newId = (this.lastId ?? 0) + 1;

    this.data.Relationships.Relationship.push({
      "$": {
        "Id": `rId${newId}`,
        "Target": target,
        "Type": type,
      }
    });

    return this;
  }

  public insert(rId: number, target: string, type: string): this {
    this.data.Relationships.Relationship = this.data.Relationships.Relationship ?? [];

    const shiftRels = this.data.Relationships.Relationship.filter((rel) => this.getRelId(rel) >= rId);
    for (const shiftRel of shiftRels) {
      shiftRel.$.Id = `rId${this.getRelId(shiftRel) + 1}`;
    }

    this.data.Relationships.Relationship.push({
      "$": {
        "Id": `rId${rId}`,
        "Target": target,
        "Type": type,
      }
    });

    return this;
  }

  public cleanup(): void {
  }
}
