import "@simplysm/core-common";
import type { Bytes } from "@simplysm/core-common";
import { num, xml as xmlU } from "@simplysm/core-common";
import type { IRelationshipModel } from "../models/i-relationship-model";
import type { ExcelRelationshipData, ExcelXmlRelationshipData } from "../types";

/**
 * *.rels 파일을 관리하는 클래스.
 * 파일 간의 참조 관계를 처리한다.
 */
export class ExcelXmlRelationship implements IRelationshipModel {
  private readonly _data: ExcelXmlRelationshipData;

  constructor(data?: ExcelXmlRelationshipData) {
    if (data == null) {
      this._data = {
        Relationships: {
          $: {
            xmlns: "http://schemas.openxmlformats.org/package/2006/relationships",
          },
        },
      };
    } else {
      this._data = data;
    }
  }

  /** @internal 테스트, 디버그용 내부 트리 접근. 상위 레이어는 인터페이스만 사용. */
  get data(): ExcelXmlRelationshipData {
    return this._data;
  }

  getTargetByRelId(rId: number): string | undefined {
    return (this._data.Relationships.Relationship ?? []).single((rel) => this._getRelId(rel) === rId)
      ?.$.Target;
  }

  add(target: string, type: string): this {
    this.addAndGetId(target, type);
    return this;
  }

  addAndGetId(target: string, type: string): number {
    this._data.Relationships.Relationship = this._data.Relationships.Relationship ?? [];

    const newId = (this._lastId ?? 0) + 1;

    this._data.Relationships.Relationship.push({
      $: {
        Id: `rId${newId}`,
        Target: target,
        Type: type,
      },
    });

    return newId;
  }

  insert(rId: number, target: string, type: string): this {
    this._data.Relationships.Relationship = this._data.Relationships.Relationship ?? [];

    const shiftRels = this._data.Relationships.Relationship.filter(
      (rel) => this._getRelId(rel) >= rId,
    );
    for (const shiftRel of shiftRels) {
      shiftRel.$.Id = `rId${this._getRelId(shiftRel) + 1}`;
    }

    this._data.Relationships.Relationship.push({
      $: {
        Id: `rId${rId}`,
        Target: target,
        Type: type,
      },
    });

    return this;
  }

  findRelByType(type: string): { relId: string; target: string } | undefined {
    const rel = (this._data.Relationships.Relationship ?? []).find((r) => r.$.Type === type);
    return rel != null ? { relId: rel.$.Id, target: rel.$.Target } : undefined;
  }

  serialize(): Bytes {
    return new TextEncoder().encode(xmlU.stringify(this._data));
  }

  private get _lastId(): number | undefined {
    const rels = this._data.Relationships.Relationship;
    if (!rels || rels.length === 0) return undefined;
    const maxRel = rels.orderByDesc((rel) => this._getRelId(rel)).first();
    return maxRel ? this._getRelId(maxRel) : undefined;
  }

  private _getRelId(rel: ExcelRelationshipData): number {
    const result = num.parseInt(rel.$.Id);
    if (result == null) {
      throw new Error(`잘못된 관계 ID 형식: ${rel.$.Id}`);
    }
    return result;
  }
}
