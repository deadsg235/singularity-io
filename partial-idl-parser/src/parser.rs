use serde::Deserialize;

/// The discriminant length of anchor instruction
pub type AnchorInstructionDiscriminatLen = [u8; 8];

/// Holds the address and instructions parsed from JSON IDL.
///
/// 1. It contains the address of the program (Public Key) defined as a String
///
/// 2. The instructions of the program
#[derive(Debug, Deserialize, PartialEq, PartialOrd)]
pub struct AnchorIdlPartialData {
    address: String,
    instructions: Vec<AnchorInstruction>,
}

impl AnchorIdlPartialData {
    /// Parse JSON IDL
    pub fn parse(idl_json_data: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str::<Self>(idl_json_data)
    }

    /// Get the program ID
    pub fn program_id(&self) -> &str {
        self.address.as_str()
    }

    /// Get an instruction by the name defined in the JSON IDL
    pub fn get_instruction(&self, name: &str) -> Option<&AnchorInstruction> {
        self.instructions
            .iter()
            .find(|instruction| instruction.name.as_bytes() == name.as_bytes())
    }

    /// Get the discriminant of an instruction given the instruction name
    pub fn get_discriminant(&self, name: &str) -> Option<AnchorInstructionDiscriminatLen> {
        self.get_instruction(name).map(|ix| ix.discriminator)
    }

    /// Get all Instructions
    pub fn get_instructions(&self) -> &[AnchorInstruction] {
        self.instructions.as_slice()
    }

    /// Get all the names for all instructions
    pub fn get_instruction_names(&self) -> Vec<&str> {
        self.instructions
            .iter()
            .map(|instruction| instruction.name.as_str())
            .collect::<Vec<&str>>()
    }
}

/// An IDL defined instruction
#[derive(Debug, Deserialize, PartialEq, PartialOrd)]
pub struct AnchorInstruction {
    /// Name of the Instruction
    pub name: String,
    /// The discriminant of the instruction
    pub discriminator: [u8; 8],
}

#[cfg(test)]
mod sanity_checks {
    use super::AnchorIdlPartialData;

    #[test]
    fn correctness() {
        let idl = "
            {
                \"address\": \"3bF44ZTKPSc4qZV97mpRA85NkQaM9D9Z6i3uYjKbs8E6\",
                \"metadata\": {
                    \"name\": \"temp\",
                    \"version\": \"0.1.0\",
                    \"spec\": \"0.1.0\",
                    \"description\": \"Created with Anchor\"
                },
                \"instructions\": [
                    {
                    \"name\": \"initialize\",
                    \"discriminator\": [
                        175,
                        175,
                        109,
                        31,
                        13,
                        152,
                        155,
                        237
                    ],
                    \"accounts\": [],
                    \"args\": []
                    }
                ]
            }
        ";

        let parse = AnchorIdlPartialData::parse(idl);
        parse.as_ref().unwrap();

        assert!(parse.is_ok());
        assert_eq!(
            parse.as_ref().unwrap().address,
            "3bF44ZTKPSc4qZV97mpRA85NkQaM9D9Z6i3uYjKbs8E6"
        );

        assert_eq!(
            parse
                .as_ref()
                .unwrap()
                .get_instruction("initialize")
                .map(|found| found.name.as_str()),
            Some("initialize")
        );
        assert_eq!(
            parse.as_ref().unwrap().get_discriminant("initialize"),
            Some([175, 175, 109, 31, 13, 152, 155, 237])
        );
    }
}
