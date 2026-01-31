import "@simplysm/core-common";
import { numParseInt } from "@simplysm/core-common";
import type { ExcelRelationshipData, ExcelXml, ExcelXmlRelationshipData } from "../types";

/**
 * *.rels 파일을 관리하는 클래스.
 * 파일 간의 참조 관계를 처리한다.
 */
export class ExcelXmlRelationship implements ExcelXml {
  data: ExcelXmlRelationshipData;

  constructor(data?: ExcelXmlRelationshipData) {
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
    return (this.data.Relationships.Relationship ?? []).single((rel) => this._getRelId(rel) === rId)
      ?.$.Target;
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

  cleanup(): void {}

  private get _lastId(): number | undefined {
    const rels = this.data.Relationships.Relationship;
    if (!rels || rels.length === 0) return undefined;
    const maxRel = rels.orderByDesc((rel) => this._getRelId(rel)).first();
    return maxRel ? this._getRelId(maxRel) : undefined;
  }

  private _getRelId(rel: ExcelRelationshipData): number {
    const match = /[0-9]+$/.exec(rel.$.Id);
    if (match == null) {
      throw new Error(`잘못된 관계 ID 형식입니다: ${rel.$.Id}`);
    }
    return numParseInt(match[0])!;
  }
}
