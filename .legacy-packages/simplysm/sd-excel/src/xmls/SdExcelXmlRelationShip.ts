import { NumberUtils } from "@simplysm/sd-core-common";
import type { ISdExcelRelationshipData, ISdExcelXml, ISdExcelXmlRelationshipData } from "../types";

export class SdExcelXmlRelationShip implements ISdExcelXml {
  data: ISdExcelXmlRelationshipData;

  constructor(data?: ISdExcelXmlRelationshipData) {
    if (data == null) {
      this.data = {
        Relationships: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/package/2006/relationships",
          },
        },
      };
    } else {
      this.data = data;
    }
  }

  getTargetByRelId(rId: number): string | undefined {
    return this.data.Relationships.Relationship?.single((rel) => this._getRelId(rel) === rId)?.$
      .Target;
  }

  add(target: string, type: string): this {
    this.addAndGetId(target, type);
    return this;
  }

  addAndGetId(target: string, type: string): number {
    this.data.Relationships.Relationship = this.data.Relationships.Relationship ?? [];

    const newId = (this._lastId ?? 0) + 1;

    this.data.Relationships.Relationship.push({
      $: {
        Id: `rId${newId}`,
        Target: target,
        Type: type,
      },
    });

    return newId;
  }

  insert(rId: number, target: string, type: string): this {
    this.data.Relationships.Relationship = this.data.Relationships.Relationship ?? [];

    const shiftRels = this.data.Relationships.Relationship.filter(
      (rel) => this._getRelId(rel) >= rId,
    );
    for (const shiftRel of shiftRels) {
      shiftRel.$.Id = `rId${this._getRelId(shiftRel) + 1}`;
    }

    this.data.Relationships.Relationship.push({
      $: {
        Id: `rId${rId}`,
        Target: target,
        Type: type,
      },
    });

    return this;
  }

  cleanup() {}

  private get _lastId(): number | undefined {
    return this.data.Relationships.Relationship?.max((rel) => this._getRelId(rel));
  }

  private _getRelId(rel: ISdExcelRelationshipData): number {
    return NumberUtils.parseInt(/[0-9]*$/.exec(rel.$.Id)![0])!;
  }
}
