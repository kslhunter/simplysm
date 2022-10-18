export interface ISdWordXml {
  readonly data: any;

  cleanup(): void;
}

export interface ISdWordXmlContentTypeData {
  "Types": {
    "$": {
      "xmlns": string;
    };
    "Default": {
      "$": {
        "Extension": string;
        "ContentType": string;
      };
    }[];
    "Override": {
      "$": {
        "PartName": string;
        "ContentType": string;
      };
    }[];
  };
}

export interface ISdWordXmlRelationshipData {
  "Relationships": {
    "$": {
      "xmlns": string;
    };
    "Relationship"?: ISdWordRelationshipData[];
  };
}


export interface ISdWordRelationshipData {
  "$": {
    "Id": string;
    "Target": string;
    "Type": string;
  };
}

export interface ISdWordXmlDocumentData {
  "w:document": {
    "$": {
      "xmlns:w": string;
    };
    "w:body"?: [{
      "w:p"?: ISdWordParaData[];
    }];
  };
}

export interface ISdWordParaData {
  "w:r"?: ISdWordBlockData[];
}

export interface ISdWordBlockData {
  "w:t"?: [string];
}
