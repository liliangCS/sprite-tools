#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";

const theme = {
  success: chalk.greenBright,
  error: chalk.redBright,
  warning: chalk.yellowBright,
  info: chalk.cyanBright,
  highlight: chalk.magentaBright,
  muted: chalk.gray
};

async function generateSpriteFromDirectory(inputDir, outputDir, options) {
  const spinner = ora(theme.info("Scanning image directory...")).start();

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
    const imagePaths = files
      .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()))
      .map((file) => path.join(inputDir, file));

    if (imagePaths.length === 0) {
      spinner.fail(theme.error("No images found in the directory"));
      process.exit(1);
    }

    spinner.succeed(theme.success(`Found ${theme.highlight(imagePaths.length)} images`));

    const metaProgress = new cliProgress.SingleBar({
      format: `${theme.info("Processing images")} ${theme.muted("[{bar}]")} {percentage}% | {value}/{total} images`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });

    metaProgress.start(imagePaths.length, 0);

    const imagesMetadata = [];
    for (const imgPath of imagePaths) {
      try {
        const image = sharp(imgPath);
        const metadata = await image.metadata();
        imagesMetadata.push({
          path: imgPath,
          filename: path.basename(imgPath),
          width: metadata.width,
          height: metadata.height,
          image
        });
        metaProgress.increment();
      } catch (err) {
        metaProgress.stop();
        spinner.fail(theme.error(`Error processing ${path.basename(imgPath)}: ${err.message}`));
        process.exit(1);
      }
    }
    metaProgress.stop();

    const imageCount = imagesMetadata.length;
    const gridSize = Math.ceil(Math.sqrt(imageCount));
    const totalCells = gridSize * gridSize;
    const maxCellWidth = Math.max(...imagesMetadata.map((img) => img.width)) + options.padding;
    const maxCellHeight = Math.max(...imagesMetadata.map((img) => img.height)) + options.padding;
    const spriteWidth = gridSize * maxCellWidth;
    const spriteHeight = gridSize * maxCellHeight;

    if (spriteWidth > options.maxSize || spriteHeight > options.maxSize) {
      spinner.fail(
        theme.error(
          `Sprite sheet dimensions (${spriteWidth}x${spriteHeight}) exceed maximum size (${options.maxSize}x${options.maxSize})`
        )
      );
      process.exit(1);
    }

    spinner.succeed(theme.success(`Calculated layout: ${theme.highlight(gridSize)}x${theme.highlight(gridSize)} grid`));
    spinner.succeed(
      theme.success(`Sprite dimensions: ${theme.highlight(spriteWidth)}x${theme.highlight(spriteHeight)}`)
    );

    const compositeProgress = new cliProgress.SingleBar({
      format: `${theme.info("Generating sprite")} ${theme.muted("[{bar}]")} {percentage}% | {value}/{total} images`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    });

    compositeProgress.start(imageCount, 0);

    const sprite = sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const composites = [];
    const positions = {};

    for (let i = 0; i < imageCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = col * maxCellWidth;
      const y = row * maxCellHeight;
      const imgMeta = imagesMetadata[i];

      composites.push({
        input: await imgMeta.image.toBuffer(),
        left: x,
        top: y
      });

      positions[imgMeta.filename] = { x, y, width: imgMeta.width, height: imgMeta.height };
      compositeProgress.increment();
    }
    compositeProgress.stop();

    const spriteOutputPath = path.join(outputDir, `${options.name}.png`);
    const jsonOutputPath = path.join(outputDir, `${options.name}.json`);

    spinner.start(theme.info("Saving sprite image..."));
    await sprite.composite(composites).toFile(spriteOutputPath);
    spinner.succeed(theme.success(`Sprite image saved to ${theme.highlight(spriteOutputPath)}`));

    spinner.start(theme.info("Generating position data..."));
    const jsonData = {
      spriteWidth,
      spriteHeight,
      gridSize,
      imageCount,
      images: positions
    };
    fs.writeFileSync(jsonOutputPath, JSON.stringify(jsonData, null, 2));
    spinner.succeed(theme.success(`Position data saved to ${theme.highlight(jsonOutputPath)}`));

    console.log("\n" + theme.success("✅ Sprite generation completed!"));
    console.log(theme.muted("┌──────────────────────────────┐"));
    console.log(theme.muted("│          Summary            │"));
    console.log(theme.muted("├──────────────────────────────┤"));
    console.log(`  ${theme.info("Images packed:")}   ${theme.highlight(imageCount)}/${totalCells}`);
    console.log(`  ${theme.info("Utilization:")}     ${theme.highlight(Math.round((imageCount / totalCells) * 100))}%`);
    console.log(`  ${theme.info("Sprite size:")}     ${theme.highlight(spriteWidth)}x${theme.highlight(spriteHeight)}`);
    console.log(
      `  ${theme.info("Cell size:")}       ${theme.highlight(maxCellWidth)}x${theme.highlight(maxCellHeight)}`
    );
    console.log(`  ${theme.info("Padding:")}         ${theme.highlight(options.padding)}px`);
    console.log(theme.muted("└──────────────────────────────┘\n"));
  } catch (error) {
    spinner.fail(theme.error(`Error: ${error.message}`));
    process.exit(1);
  }
}

program
  .name("sprite")
  .description(theme.highlight("CLI tool to generate sprite sheets from a directory of images"))
  .version("1.1.0", "-v, --version", "show version")
  .requiredOption("-i, --input <dir>", theme.info("input directory containing images"))
  .option("-o, --output <dir>", theme.info("output directory"), "./output")
  .option("-n, --name <name>", theme.info("base name for output files"), "sprite")
  .option("-p, --padding <pixels>", theme.info("padding between images"), "0")
  .option("-m, --max-size <pixels>", theme.info("maximum sprite dimensions"), "4096")
  .action((options) => {
    console.log(theme.muted("\n🛠️  Starting sprite generation...\n"));

    options.padding = parseInt(options.padding);
    options.maxSize = parseInt(options.maxSize);

    generateSpriteFromDirectory(options.input, options.output, options);
  });

program.addHelpText(
  "after",
  `
${theme.info("Examples:")}

  ${theme.muted("# Basic usage")}
  $ sprite -i ./images -o ./output

  ${theme.muted("# With custom options")}
  $ sprite -i ./assets -o ./sprites -n game-sprites -p 10 -m 2048

${theme.warning("Note:")} Requires Node.js 14+
`
);

program.parse(process.argv);
