const {
  methodLexer,
  propertyLexer,
  classLexer,
  constructorLexer,
  inheritanceLexer,
  classTypeLexer,
} = require("./lexers");
const {
  classRe,
  methodRe,
  methodReG,
  constructorReG,
  propertiesRe,
  propertiesReG,
  eventHandlerRe,
} = require("./regex");
const fs = require("fs");
const nomnoml = require("nomnoml");
const { Console } = require("console");

/**
 * Remove calls to a super constructor, if there are no such calls, the given definition is returned.
 *
 * @param definition {string} The definition from which the super call must be stripped.
 * @return {string} The cleaned definition.
 */
function removeSuperConstructorCalls(definition) {
  if (definition.includes(":") && definition.includes("base")) {
    return definition.split(":")[0];
  }
  return definition;
}

/**
 * Clean a .cs file for processing by removing line breaks in method or class definitions.
 * This method also removes any trailing whitespaces and replaces subsequent whitespaces with a single space in order
 * to simplify the regular expressions. Furthermore, all non-essential lines, such as the bodies of methods, are
 * deleted because they don't contribute to the UML diagram. Statement terminators (';') are also removed.
 *
 * @param file {string} The file that is to be cleaned.
 * @return {string} The cleaned file.
 */
function cleanFile(file) {
  // Split the file on a line breaks.
  const lines = file.split("\n").map((l) => l.trim());
  const cleanedFile = [];

  let definition = "";
  let isDefinition = false;
  for (let line of lines) {
    // console.log("Line before replacement:", line);
    // Replace all subsequent whitespaces with a single space and remove all trailing whitespaces.
    line = line.replace(/\s\s+/g, " ").trim();
    // Replace get/set properties with empty string
    line = line.replace(/{ *get *; *set *; *}/g, "");
    // Replace everything between '=' and ';' with empty string
    line = line.replace(/\s=.*;/g, ";");
    // console.log("Line after replacement:", line);

    if (isDefinition) {
      // Reached the body, this line can be ignored in the cleaned file.
      if (definition.includes("{")) {
        cleanedFile.push(
          removeSuperConstructorCalls(definition.replace(";", ""))
        );

        definition = "";
        isDefinition = false;
      }

      // Reached the end of an abstract definition, the following line can be a new line in the cleaned file.
      else if (definition.endsWith(";")) {
        definition += line;
        cleanedFile.push(
          removeSuperConstructorCalls(definition.replace(";", ""))
        );

        definition = "";
        isDefinition = false;
      }

      // The multiline definition hasn't been completed yet.
      else {
        definition += line;
      }
    }
    // The line is the start of a new definition.
    else if (/^(public|private|protected)/.test(line)) {
      // If the definition matches one of the regular expressions, it can't be a multiline definition.
      line = removeSuperConstructorCalls(line);
      if (
        classRe.test(line) ||
        methodRe.test(line) ||
        propertiesRe.test(line) ||
        eventHandlerRe.test(line)
      ) {
        cleanedFile.push(line.replace(";", ""));
      } else {
        definition = line;
        isDefinition = true;
      }
    }
  }
  return cleanedFile.join("\n");
}

/**
 * Extract information about an exercise from the given path.
 *
 * @param path {string} The path of the file from which the info must be extracted.
 * @return {[string,string,boolean]} An triple containing:
 *  - The chapter for which this is an exercise.
 *  - The name of the exercise.
 *  - Whether this is a diagram for a ViewModel.
 */
const getExercisesInfo = (path) => {
  const parts = path.split("\\");
  // Find the exercise full name, which matches the following '07_00' using regex
  const exerciseFullname = parts.find((e) => /\d_\d\d/.test(e));
  console.log("Exercise fullname:", exerciseFullname);
  const chapter = exerciseFullname.substring(0, exerciseFullname.indexOf("_"));
  const exercise = exerciseFullname.substring(
    exerciseFullname.indexOf("_") + 1
  );
  const isViewModel =
    path.toLowerCase().includes("viewmodel") &&
    parts[parts.length - 2].toLowerCase().includes("viewmodel");
  return [chapter, exercise, isViewModel];
};

/**
 * Extract the name of a C# file from an absolute path.
 *
 * @param path {string} The absolute path.
 * @returns {string} The filename.
 */
const getFilename = (path) => {
  const parts = path.split("\\");
  return parts.slice(-1)[0].replace(".cs", "");
};

/**
 *
 * @param data {string} The filepath for which to generate the diagram.
 * @returns {Array} An array of strings, each string representing a class or interface.
 */
const generateInheritanceDiagramFromFile = (file) => {
  const data = cleanFile(fs.readFileSync(file, "utf8"));
  const classSignature = data.match(classRe)[0];
  let temp = inheritanceLexer(classSignature);
  return temp;
};

// TODO: Add support for inner classes, if needed. For now this can be ignored since I believe inner classes aren't
// used anywhere in the course.
/**
 * Generate a nomnoml class diagram for the given class or interface.
 *
 * @param data {string} The text of a single .cs file, i.e. a single class or interface.
 * @return {string} The text representation of the nomnoml diagram.
 */
const generateClassDiagramFromString = (data) => {
  console.log("----- Data: ");
  console.log(data);
  console.log("----- End of data");
  const diagram = [];

  const classSignature = data.match(classRe)[0];
  const [className, nomnomlClassDefinition, inheritance] =
    classLexer(classSignature);

  // Retrieve classname
  diagram.push(`class ${className} {`);
  diagram.push("\n");

  // Retrieve class type
  const classType = classTypeLexer(classSignature);
  diagram.push(classType);

  // Retrieve all properties
  const properties = [...data.matchAll(propertiesReG)];
  console.log("properties:", properties);
  console.log();
  console.log();
  properties.forEach((p) => diagram.push(propertyLexer(p[0])));

  // Retrieve all constructors.
  const constructors = [...data.matchAll(constructorReG(className))];
  console.log("Constructors:", constructors);
  console.log();
  console.log();
  constructors.forEach((c) => diagram.push(constructorLexer(c[0])));

  // Retrieve all methods.
  const methods = [...data.matchAll(methodReG)];
  methods.forEach((m) => diagram.push(methodLexer(m[0])));
  console.log("Methods:", methods);
  console.log();
  console.log();

  diagram.push("}");

  return diagram.join("") + "\n";
};

/**
 * Generate the UML diagram for a given file.
 *
 * @param file {string} The filepath for which to generate the diagram.
 * @return {string} The nomnoml string representation of the given file.
 */
function generateDiagramFromFile(file) {
  //console.log(file);
  // Read the file and extract all relevant signatures.
  try {
    const data = cleanFile(fs.readFileSync(file, "utf8"));
    return generateClassDiagramFromString(data);

    //console.log(diagram);
  } catch (err) {
    console.error(err);
  }
}

/**
 *
 * @param nomnomlString {string}
 * @return {string}
 */
function convertNomnomlToSvg(nomnomlString) {
  return nomnoml
    .renderSvg(nomnomlString)
    .replaceAll("@%%", "[]")
    .replaceAll("&lt;&lt; ", "&lt;&lt;")
    .replaceAll(" &gt;&gt;", "&gt;&gt;");
}

module.exports = {
  getExercisesInfo,
  getFilename,
  generateClassDiagramFromString,
  generateDiagramFromFile,
  convertNomnomlToSvg,
  generateInheritanceDiagramFromFile,
};
