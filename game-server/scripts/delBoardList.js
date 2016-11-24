/**
 * Created by vietanha34 on 11/2/16.
 */


var curServer = app.curServer;
var boardService = app.get('boardService');
boardService
  .getBoard({
    where: {
      serverId: curServer.id
    },
    raw : true,
    attributes : ['boardId'],
  })
  .then(function (boards) {
    for (var i = 0, len = boards.length; i < len; i++) {
      var board = app.game.getBoard(boards[i].boardId);
      if (!board) {
        app.game.delBoard(boards[i].boardId);
      }
    }
  });