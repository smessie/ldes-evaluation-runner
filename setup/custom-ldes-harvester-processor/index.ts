import {Writer} from "@rdfc/js-runner";
import {replicateLDES} from "ldes-client";
import {DataFactory} from "rdf-data-factory";
import {SDS, TREE} from "@treecg/types";
import {Quad_Object} from "@rdfjs/types";
import {DataFactory as NDataFactory, Writer as NWriter} from "n3";
import {LeafCondition} from "ldes-client";
import {pred} from "rdf-lens";
import namedNode = NDataFactory.namedNode;

const df = new DataFactory();

export function harvest(
   outgoing: Writer<string>,
   url: string,
   start: Date,
   end: Date,
   interval: number = 3_600_000,
   amountPerInterval: number = 100,
): () => Promise<void> {
   console.log(`Harvesting from ${start.toISOString()} to ${end.toISOString()} with interval ${interval} and ${amountPerInterval} per interval`);

   /**************************************************************************
    * Any code that must be executed after the pipeline goes online must be  *
    * embedded in the returned function. This guarantees that all channels   *
    * are initialized and the other processors are available. A common use   *
    * case is the source processor, which introduces data into the pipeline  *
    * from an external source such as the file system or an HTTP API, since  *
    * these must be certain that the downstream processors are ready and     *
    * awaiting data.                                                         *
    *                                                                        *
    * Note that this entirely optional, and you may return void instead.     *
    **************************************************************************/
   return async () => {
      console.log('Harvesting data');
      let date = new Date(start);
      while (date < end) {
         // Configure ldes-client
         const timestampTerm = namedNode("http://www.w3.org/ns/prov#generatedAtTime");
         const path = pred(timestampTerm);
         const condition = new LeafCondition({
            relationType: namedNode(TREE.GreaterThanOrEqualToRelation),
            value: date.toISOString(),
            compareType: 'date',
            path: path,
            pathQuads: {entry: timestampTerm, quads: []}
         });
         condition.range.add(new Date(date.getTime() + interval).toISOString(), TREE.LessThanRelation);
         const ldesClient = replicateLDES({
            url: url,
            polling: false,
            condition: condition,
         });

         let count = 0;
         const reader = ldesClient.stream().getReader();

         let element = await reader.read();
         while (element) {
            if (element.value) {
               count++;

               const blank = df.blankNode();
               const quads = element.value.quads.slice();
               quads.push(
                  df.quad(blank, SDS.terms.stream, <Quad_Object>ldesClient.streamId!),
                  df.quad(blank, SDS.terms.payload, <Quad_Object>element.value.id!),
               );

               await outgoing.push(new NWriter().quadsToString(quads));
            }

            if (count >= amountPerInterval) {
               await reader.cancel();
               element = null;
            } else {
               element = await reader.read();
            }
         }


         date = new Date(date.getTime() + interval);
      }
   };
}
