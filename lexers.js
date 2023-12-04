const {
  useLollipop,
  useCursiveAbstract,
  includeUnderscoredProperties,
  includeParameters,
} = require("./config");
const { parameterListRe, singleParameterReG } = require("./regex");

// Symbol map for UML diagrams:
const symbolMap = {
  public: "+",
  private: "-",
  protected: "#",
  internal: "~",
  generalization: "-:>",
  implementation: useLollipop ? "-" : "--:>",
  implementationDirective: useLollipop ? "<lollipop>" : "",
  // Must use '<< ' because otherwise nomnoml will render it as a directive instead of text.
  // The spaces must be corrected in the final svg.
  abstract: "<<abstract>>",
  staticMember: "<<static>>",
  interface: "<< interface >>;",
  // No special syntax required for a regular class.
  class: "",
};

function classTypeLexer(classSignature) {
  if (classSignature.includes("abstract"))
    return "\t" + symbolMap.abstract + "\n";
  if (classSignature.includes("static"))
    return "\t" + symbolMap.staticMember + "\n";
  return "";
}

// Lexers to transform the C# signatures to UML.

function inheritanceLexer(classSignature) {
  const inheritance = [];

  const abstract = classSignature.includes("abstract")
    ? symbolMap.abstract
    : "";
  classSignature = classSignature.replace(" abstract", "");

  const staticString = classSignature.includes("static")
    ? symbolMap.staticMember
    : "";
  classSignature = classSignature.replace(" static", "");

  // TODO Figure out how to show private, protected or internal classes in a UML diagram.
  const [_, classType, className] = classSignature.split(":")[0].split(" ");

  // I believe this works, since a class can either be an enum, interface, abstract or static, but not 2 or more of
  // these. I might be mistaken....
  const nomnomlClassDefinition = `${symbolMap[classType]}${className}`;

  console.log("nomnomlClassDefinition", nomnomlClassDefinition);

  // Extract everything after the :, if a part of the array starts with an I, it is treated as an interface.
  // This follows C# naming conventions but isn't ideal and doesn't translate to other languages such as Java.
  if (classSignature.includes(":")) {
    const superClasses = classSignature
      .split(":")[1]
      .split(",")
      .map((x) => x.trim());

    for (const superClass of superClasses) {
      // TODO -- Show correct arrow
      //   const isInterface = superClass.startsWith("I");
      //   const type = isInterface
      //     ? symbolMap.implementation
      //     : symbolMap.generalization;
      //   const implementationDirective = isInterface
      //     ? symbolMap.implementationDirective
      //     : "";
      inheritance.push(`${superClass}<|--${nomnomlClassDefinition}`);
    }
  }

  return inheritance;
}

/**
 * Take a C# class or interface definition and turn it into a UML class header.
 *
 * @param classSignature {string}
 * @returns {[string, string, string[]]} A triple containing:
 *  - The name of the class.
 *  - The nomnoml class definition WITHOUT the enclosing brackets.
 *  - A (possibly empty) array containing all the classes or interfaces that are implemented by this class.
 */
function classLexer(classSignature) {
  const inheritance = [];

  const abstract = classSignature.includes("abstract")
    ? symbolMap.abstract
    : "";
  classSignature = classSignature.replace(" abstract", "");

  const staticString = classSignature.includes("static")
    ? symbolMap.staticMember
    : "";
  classSignature = classSignature.replace(" static", "");

  // TODO Figure out how to show private, protected or internal classes in a UML diagram.
  const [_, classType, className] = classSignature.split(":")[0].split(" ");

  // I believe this works, since a class can either be an enum, interface, abstract or static, but not 2 or more of
  // these. I might be mistaken....
  const nomnomlClassDefinition = `${symbolMap[classType]}${abstract}${staticString}${className}`;

  // Extract everything after the :, if a part of the array starts with an I, it is treated as an interface.
  // This follows C# naming conventions but isn't ideal and doesn't translate to other languages such as Java.
  if (classSignature.includes(":")) {
    const superClasses = classSignature
      .split(":")[1]
      .split(",")
      .map((x) => x.trim());

    for (const superClass of superClasses) {
      const isInterface = superClass.startsWith("I");
      const type = isInterface
        ? symbolMap.implementation
        : symbolMap.generalization;
      const implementationDirective = isInterface
        ? symbolMap.implementationDirective
        : "";
      inheritance.push(`${superClass}<|--${nomnomlClassDefinition}`);
    }
  }

  return [className, nomnomlClassDefinition, inheritance];
}

/**
 * Take a C# constructor signature and turn it into a UML class diagram method definition.
 *
 * @param constructor {string}
 * @returns {string}
 */
function constructorLexer(constructor) {
  // Extract the parameter list.
  const [_, coreInfo, params] = constructor.match(parameterListRe);
  const nomnomlParams = parameterLexer(params);
  console.log("Constructorlexer");
  console.log("coreInfo:", coreInfo);
  console.log("Params:", params);
  const [accessModifier, name] = coreInfo.split(/( .*)/s);
  console.log("accessModifier:", accessModifier);
  console.log("name:", name);
  const returnString = `\t${symbolMap[accessModifier]}${name}(${nomnomlParams})\n`;
  console.log("returnString:", returnString);
  return returnString;
}

/**
 * Take a C# property definition with the format `accessModifier type name` and convert it to nomnoml code in the format
 * `(-|+|#) name: type;`.
 *
 * @param property {string}
 * @returns {string}
 */
function propertyLexer(property) {
  console.log("PropertyLexer");
  console.log("property:", property);
  const splitProperty = property.split(" ");
  let [accessModifier, dataType, name] = splitProperty;

  if (splitProperty.length === 4) {
    // TODO Property is static, virtual or override, add this to diagram
    dataType = splitProperty[2];
    name = splitProperty[3];
  }

  console.log("accessModifier:", accessModifier);
  console.log("dataType:", dataType);
  console.log("name:", name);

  if (!includeUnderscoredProperties && name.startsWith("_")) return "";
  return `\t${symbolMap[accessModifier]}${name} : ${dataType}\n`;
}

/**
 * Take a C# method signature and convert it to a nomnoml UML method.
 * TODO Add support for method parameters, this requires a new test file.
 * TODO Add support for arrow functions
 *
 * @param method {string}
 * @returns {string}
 */
function methodLexer(method) {
  let isAbstract = method.includes("abstract");
  const abstractMethodSymbol = isAbstract ? "*" : "";
  const staticMethodSymbol = method.includes("static") ? "$" : "";

  // Remove all 'virtual' and 'override' from array.
  // Students must be able to figure this out for themselves.
  method = method
    .replace(" virtual", "")
    .replace(" override", "")
    .replace(" abstract", "");

  // Extract the parameter list.
  const [_, coreInfo, params] = method.match(parameterListRe);
  const nomnomlParams = parameterLexer(params);
  const splitMethod = coreInfo.split(" ");
  let [accessModifier, returnType, name] = splitMethod;

  if (splitMethod.length === 4) {
    // Method is static
    returnType = splitMethod[2];
    name = splitMethod[3];
  }

  const mermaidMethod = `\t${
    symbolMap[accessModifier]
  }${name}(${nomnomlParams})${abstractMethodSymbol}${staticMethodSymbol} ${escapeType(
    returnType
  )}\n`;

  return mermaidMethod;
}

// TODO Add support for default values, currently they are ignored.
/**
 * Take a C# parameter list and convert it to a nomnoml definition.
 *
 * @param parameters
 */
function parameterLexer(parameters) {
  if (!includeParameters || parameters === "") return "";
  const parameterList = [];

  [...parameters.matchAll(singleParameterReG)].forEach(
    ([_, type, name, defaultValues]) => parameterList.push(`${name}: ${type}`)
  );

  console.log("parameterList:", parameterList);

  return parameterList.join(", ");
}

/**
 * Escape any characters that interfere with mermaidJs.
 *
 * @param type {string}
 * @return {string}
 */
function escapeType(type) {
  // If the diagram contains an array, the square brackets will interfere with mermaidJs.
  // Replacing them allows for rendering, in the svg the values can then be changed back.
  // HTML Entities can't be used since mermaidJs replaces & with &amp;.
  return type
    .replace("[", "@")
    .replace("]", "%%")
    .replace("<", "~")
    .replace(">", "~");
}

module.exports = {
  classLexer,
  propertyLexer,
  methodLexer,
  constructorLexer,
  inheritanceLexer,
  classTypeLexer,
};
