<?php
namespace linko\Game;
/**
 *
 * @author Mr_Kywar mr_kywar@gmail.com
 */
abstract class Game implements GameInterface {

    /**
     * @var PlayerCollection
     */
    private $players;

    private $gameInfos;
    public function __construct() {
        parent::__construct();
        $this->players = new PlayerCollection();
        $this->gameInfos = GameInfoFactory::create();
    }

    public static function getGameinfos() {
        return self::GAME_INFOS;
    }

    public function setupNewGame(array $players, $options = []): \GameInterface {
        $gameInfo = self::getGameinfos() ;
        $defaultColors = $gameInfo['player_colors'];
        shuffle($defaultColors);
        
        foreach ( $players as $id => $player ) {
            $color = array_shift($defaultColors);
            
            $player = new Player();
            $player->setId($id)
                    ->setName($player ['player_name'])
                    ->setColor($color)
                    ->setAvatar($player ['player_avatar'])
                    ->setCanal($player ['player_canal']);
            
            $this->players->addPlayer($player);
        }
        
    }

    /**
     * 
     * @return PlayerCollection
     */
    public function getPlayers(): PlayerCollection {
        return $this->players;
    }

    /**
     * Get the number of players
     * @return int
     */
    function getPlayersNumber() {
        return count($this->getPlayers());
    }

}

/*
public function initPlayers($players) {
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos ['player_colors'];
        shuffle($default_colors);
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array ();
        
        $sql .= implode($values, ',');
        self::DbQuery($sql);
        if ($gameinfos ['favorite_colors_support']){
            self::reattributeColorsBasedOnPreferences($players, $gameinfos ['player_colors']);
        }
        self::reloadPlayersBasicInfos();
        $this->activeNextPlayer(); // just in case so its not 0, dev code can change it later
    }*/